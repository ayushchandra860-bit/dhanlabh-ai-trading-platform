import { LoggerService } from '../LoggerService';
import { MarsSQLiteAdapter } from './db/MarsSQLiteAdapter';
import { VisionResult } from '../vision';

// Import V2.1 Pipeline Engines
import { DataIntegrityPipeline } from './pipeline/safety/DataIntegrityPipeline';
import { ObservationQualityAssessor } from './pipeline/safety/ObservationQualityAssessor';
import { FeatureExtractionEngine } from './pipeline/math/FeatureExtractionEngine';
import { FeatureScaler } from './pipeline/math/FeatureScaler';
import { MultiTimeframeEngine } from './pipeline/context/MultiTimeframeEngine';
import { RegimeClassifier } from './pipeline/context/RegimeClassifier';
import { ContextAggregator } from './pipeline/context/ContextAggregator';
import { HypothesisGenerationEngine } from './pipeline/reasoning/HypothesisGenerationEngine';
import { LikelihoodEstimationEngine } from './pipeline/bayes/LikelihoodEstimationEngine';
import { BayesianNetworkEngine } from './pipeline/bayes/BayesianNetworkEngine';
import { ConfidenceBoundsManager } from './pipeline/calibration/ConfidenceBoundsManager';
import { RealityCheckEngine } from './pipeline/calibration/RealityCheckEngine';
import { RecommendationEngine } from './pipeline/explainability/RecommendationEngine';
import { PluggableNeuralInterface } from './pipeline/neural/PluggableNeuralInterface';
import { ONNXRuntimeAdapter } from './pipeline/neural/ONNXRuntimeAdapter';
import { CalibrationConfigManager } from './pipeline/calibration/CalibrationConfigManager';
import { CalibrationFramework } from './pipeline/calibration/CalibrationFramework';
import path from 'path';
import { app } from 'electron';

export let marsDatabase: MarsSQLiteAdapter;

// Singletons for V2.1 Orchestration
let integrityPipeline: DataIntegrityPipeline;
let qualityAssessor: ObservationQualityAssessor;
let featureExtraction: FeatureExtractionEngine;
let featureScaler: FeatureScaler;
let mtfEngine: MultiTimeframeEngine;
let regimeClassifier: RegimeClassifier;
let contextAggregator: ContextAggregator;
let hypothesisEngine: HypothesisGenerationEngine;
let likelihoodEngine: LikelihoodEstimationEngine;
let bayesianEngine: BayesianNetworkEngine;
let confidenceBounds: ConfidenceBoundsManager;
let realityCheck: RealityCheckEngine;
let recommendationEngine: RecommendationEngine;
let neuralInterface: PluggableNeuralInterface;
export let calibrationFramework: CalibrationFramework;
export let calibrationConfig: CalibrationConfigManager;

/**
 * Initializes the entire MARS V2.1 pipeline asynchronously and safely.
 */
export async function initMars() {
  try {
    LoggerService.info('[MARS V2.1] Initializing Market Analysis & Research Scientist...');

    // 0. Initialize Calibration Framework
    calibrationFramework = new CalibrationFramework();
    calibrationConfig = calibrationFramework.configManager;

    // 1. Initialize Database
    marsDatabase = new MarsSQLiteAdapter();
    await marsDatabase.connect();

    // 2. Instantiate V2.1 Pipeline Components
    integrityPipeline = new DataIntegrityPipeline();
    qualityAssessor = new ObservationQualityAssessor();
    featureExtraction = new FeatureExtractionEngine();
    featureScaler = new FeatureScaler();
    mtfEngine = new MultiTimeframeEngine();
    regimeClassifier = new RegimeClassifier();
    contextAggregator = new ContextAggregator();
    hypothesisEngine = new HypothesisGenerationEngine(calibrationConfig);
    likelihoodEngine = new LikelihoodEstimationEngine(calibrationConfig);
    bayesianEngine = new BayesianNetworkEngine();
    confidenceBounds = new ConfidenceBoundsManager(calibrationConfig);
    realityCheck = new RealityCheckEngine(calibrationConfig);
    recommendationEngine = new RecommendationEngine();

    // 3. Neural Runtime
    neuralInterface = new PluggableNeuralInterface();
    const onnxAdapter = new ONNXRuntimeAdapter();
    neuralInterface.attachRuntime(onnxAdapter);
    
    // Attempt to load model (will fallback safely if not found)
    const userDataPath = app ? app.getPath('userData') : __dirname;
    const modelPath = path.join(userDataPath, 'mars_model.onnx');
    await onnxAdapter.initializeModel(modelPath);

    LoggerService.info('[MARS V2.1] Initialization complete. Scientist is observing.');
  } catch (error) {
    LoggerService.error(`[MARS FATAL] Failed to initialize MARS: ${error}`);
  }
}

/**
 * Feeds a VisionResult into MARS V2.1 Pipeline. 
 * Called from runAiOrchestrationLoop in main.ts.
 * Returns the full MARS Recommendation Payload.
 */
export async function feedVisionResult(result: VisionResult): Promise<any> {
  try {
    // 1. Quality Assessment
    if (!qualityAssessor) {
      // Pipeline is still booting up (initMars hasn't finished yet)
      return { status: 'STANDBY', reason: 'MARS is booting...' };
    }

    const quality = qualityAssessor.assess(result);
    if (!quality.isValid) {
      return { status: 'REJECTED', reason: quality.rejectReason };
    }

    // 2. Feature Extraction & Scaling
    const features = featureExtraction.extract(result.candles || []);
    const scaledVector = featureScaler.scaleFeatures(features);
    const safeVector = integrityPipeline.sanitizeVector(scaledVector, 'Vision_Extraction');

    // 3. Temporal Context Aggregation
    mtfEngine.registerObservation(result);
    const mtfAlignment = mtfEngine.getAlignment(); 
    const regime = regimeClassifier.classify(features);
    const temporalContext = contextAggregator.aggregate(safeVector, regime, mtfAlignment);

    // 4. Hypothesis Generation
    const hypothesis = hypothesisEngine.generate(temporalContext);

    // 5. Bayesian Inference / Neural Fallback
    let posterior = 0.5;
    const prior = (hypothesis.confidence || 50) / 100;
    const likelihood = likelihoodEngine.estimateLikelihood(result, hypothesis);
    const marginal = likelihoodEngine.estimateMarginal(result);

    try {
      const neuralProbabilities = await neuralInterface.getNeuralEmbeddings(temporalContext);
      if (neuralProbabilities && neuralProbabilities.length >= 1) {
         posterior = neuralProbabilities[0]; // Example mapping
      } else {
         posterior = bayesianEngine.updateBelief(prior, likelihood, marginal);
      }
    } catch(e) {
      posterior = bayesianEngine.updateBelief(prior, likelihood, marginal);
    }
    
    // 6. Confidence Calibration & Reality Check
    const finalConfidence = confidenceBounds.enforceBounds(posterior, temporalContext);
    
    const realityReport = realityCheck.evaluate(finalConfidence, temporalContext);

    // 7. Recommendation Generation
    const recommendation = recommendationEngine.buildRecommendation(
      temporalContext, 
      hypothesis, 
      finalConfidence, 
      realityReport.passed,
      result.aiDecisionData
    );

    // Provide the combined payload for the UI
    return {
      status: 'SUCCESS',
      temporalContext,
      hypothesis,
      decision: recommendation
    };

  } catch (err) {
    LoggerService.error(`[MARS FAIL-SAFE] Pipeline crashed: ${err}`);
    return { status: 'ERROR', reason: String(err) };
  }
}

// Stub for marketBrain compatibility with main.ts
export const marketBrain = {
  getRecommendation: async (result: VisionResult) => {
    return feedVisionResult(result);
  }
};

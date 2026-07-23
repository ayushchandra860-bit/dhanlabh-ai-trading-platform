import { TemporalContext } from '../context/ContextAggregator';

/**
 * The 10-Year Evolution Architecture Interface.
 * 
 * Today: MARS uses deterministic Bayesian updating and CKG traversal.
 * Tomorrow: We can hot-swap a TensorFlow or ONNX runtime into this interface 
 * without modifying the core pipeline structure.
 */
export interface INeuralRuntime {
  initializeModel(modelPath: string): Promise<void>;
  runInference(context: TemporalContext): Promise<number[]>;
  shutdown(): Promise<void>;
}

export class PluggableNeuralInterface {
  private runtime: INeuralRuntime | null = null;

  public attachRuntime(runtime: INeuralRuntime): void {
    this.runtime = runtime;
  }

  public async getNeuralEmbeddings(context: TemporalContext): Promise<number[] | null> {
    if (!this.runtime) return null; // Fallback to classical Bayesian Math
    return this.runtime.runInference(context);
  }
}

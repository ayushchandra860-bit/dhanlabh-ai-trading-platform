import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { CalibrationProfile, CalibrationAuditLog } from './CalibrationTypes';
import { LoggerService } from '../../../LoggerService';

export class CalibrationConfigManager {
  private configPath: string;
  private auditPath: string;
  
  private profiles: Map<string, CalibrationProfile> = new Map();
  private activeProfileId: string = '';
  
  constructor(customPath?: string) {
    if (customPath) {
      this.configPath = customPath;
      this.auditPath = customPath.replace('.json', '_audit.json');
    } else {
      const userDataPath = app?.getPath('userData') || process.cwd();
      this.configPath = path.join(userDataPath, 'mars_calibration_profiles.json');
      this.auditPath = path.join(userDataPath, 'mars_calibration_audit.json');
    }
    this.loadProfiles();
  }

  private getDefaultProfile(): CalibrationProfile {
    return {
      id: 'default-production',
      version: '1.0.0',
      createdAt: Date.now(),
      description: 'Factory default MARS calibration profile',
      thresholds: {
        minimumActionableConfidence: 0.55,
        singleTimeframePenalty: 0.15,
        maxConfidenceCap: 0.95,
        chaosRegimeCap: 0.60
      },
      likelihoods: {
        neutralBaseline: 0.5,
        trendContinuationMultiplier: 0.8,
        reversalExhaustionMultiplier: 0.85
      },
      regimes: {
        highVolTrendConfidence: 80.0,
        lowVolRangeConfidence: 65.0,
        highVolRangeConfidence: 90.0,
        lowVolTrendConfidence: 55.0,
        timeframeAlignmentBoost: 15.0
      }
    };
  }

  private loadProfiles(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(data);
        this.activeProfileId = parsed.activeProfileId;
        
        for (const p of parsed.profiles) {
          this.profiles.set(p.id, p);
        }
      } else {
        const defaultProfile = this.getDefaultProfile();
        this.profiles.set(defaultProfile.id, defaultProfile);
        this.activeProfileId = defaultProfile.id;
        this.saveProfiles();
        this.logAudit({
          timestamp: Date.now(),
          action: 'ACTIVATE_PROFILE',
          targetProfileId: defaultProfile.id,
          reason: 'Initial factory default setup'
        });
      }
    } catch (err) {
      LoggerService.error(`[CalibrationConfig] Failed to load profiles: ${err}`);
      // Fallback to memory defaults
      const defaultProfile = this.getDefaultProfile();
      this.profiles.set(defaultProfile.id, defaultProfile);
      this.activeProfileId = defaultProfile.id;
    }
  }

  private saveProfiles(): void {
    try {
      const data = {
        activeProfileId: this.activeProfileId,
        profiles: Array.from(this.profiles.values())
      };
      fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      LoggerService.error(`[CalibrationConfig] Failed to save profiles: ${err}`);
    }
  }

  public getActiveProfile(): CalibrationProfile {
    const profile = this.profiles.get(this.activeProfileId);
    if (!profile) {
       LoggerService.warn(`[CalibrationConfig] Active profile ${this.activeProfileId} not found, falling back to default.`);
       return this.getDefaultProfile();
    }
    return profile;
  }
  
  public getProfile(id: string): CalibrationProfile | undefined {
    return this.profiles.get(id);
  }

  public getAllProfiles(): CalibrationProfile[] {
    return Array.from(this.profiles.values());
  }

  public saveCandidateProfile(profile: CalibrationProfile, reason: string): void {
    this.profiles.set(profile.id, profile);
    this.saveProfiles();
    this.logAudit({
      timestamp: Date.now(),
      action: 'CREATE_CANDIDATE',
      targetProfileId: profile.id,
      reason
    });
  }

  public activateProfile(id: string, reason: string): boolean {
    if (!this.profiles.has(id)) {
      LoggerService.error(`[CalibrationConfig] Cannot activate unknown profile: ${id}`);
      return false;
    }
    
    const previousId = this.activeProfileId;
    this.activeProfileId = id;
    this.saveProfiles();
    
    this.logAudit({
      timestamp: Date.now(),
      action: 'ACTIVATE_PROFILE',
      targetProfileId: id,
      previousProfileId: previousId,
      reason
    });
    
    LoggerService.info(`[CalibrationConfig] Activated profile: ${id}`);
    return true;
  }

  public rollbackToProfile(id: string, reason: string): boolean {
    if (!this.profiles.has(id)) {
      LoggerService.error(`[CalibrationConfig] Cannot rollback to unknown profile: ${id}`);
      return false;
    }
    
    const previousId = this.activeProfileId;
    this.activeProfileId = id;
    this.saveProfiles();
    
    this.logAudit({
      timestamp: Date.now(),
      action: 'ROLLBACK_PROFILE',
      targetProfileId: id,
      previousProfileId: previousId,
      reason
    });
    
    LoggerService.warn(`[CalibrationConfig] Rolled back to profile: ${id} | Reason: ${reason}`);
    return true;
  }

  public logAudit(log: CalibrationAuditLog): void {
    try {
      let logs: CalibrationAuditLog[] = [];
      if (fs.existsSync(this.auditPath)) {
        logs = JSON.parse(fs.readFileSync(this.auditPath, 'utf-8'));
      }
      logs.push(log);
      fs.writeFileSync(this.auditPath, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (err) {
      LoggerService.error(`[CalibrationConfig] Failed to write audit log: ${err}`);
    }
  }
  
  public getAuditLogs(): CalibrationAuditLog[] {
    try {
      if (fs.existsSync(this.auditPath)) {
        return JSON.parse(fs.readFileSync(this.auditPath, 'utf-8'));
      }
    } catch (err) {
      LoggerService.error(`[CalibrationConfig] Failed to read audit logs: ${err}`);
    }
    return [];
  }
}

#!/usr/bin/env python3
"""
VitalGuard AI - Deterioration Prediction Model Training
Trains on hospital deterioration dataset using only the vitals features available in the app.

Features used (matching PatientDetails vitals):
- heart_rate
- spo2 (spo2_pct in dataset)
- resp_rate (respiratory_rate in dataset)
- systolic_bp
- diastolic_bp
- temperature (temperature_c in dataset)

Usage:
    python ML/train_model.py
"""

import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
import warnings
warnings.filterwarnings('ignore')

# Feature mapping from dataset to app
FEATURE_MAPPING = {
    'heart_rate': 'heart_rate',
    'spo2_pct': 'spo2',
    'respiratory_rate': 'resp_rate',
    'systolic_bp': 'systolic_bp',
    'diastolic_bp': 'diastolic_bp',
    'temperature_c': 'temperature'
}

# Features in dataset
DATASET_FEATURES = list(FEATURE_MAPPING.keys())

# Features in app
APP_FEATURES = list(FEATURE_MAPPING.values())

def load_and_prepare_data():
    """Load the dataset and prepare features."""
    print("Loading dataset...")
    
    # Load the ML-ready dataset
    df = pd.read_csv('ML/hospital_deterioration_ml_ready.csv')
    print(f"Loaded {len(df)} records")
    
    # Select only the vitals features we use in the app
    X = df[DATASET_FEATURES].values
    y = df['deterioration_next_12h'].values
    
    print(f"\nFeatures used: {DATASET_FEATURES}")
    print(f"Total samples: {len(df)}")
    print(f"Positive class (deterioration): {y.sum()} ({y.mean():.2%})")
    print(f"Negative class (no deterioration): {(1-y).sum()} ({(1-y).mean():.2%})")
    
    return df, X, y

def calculate_thresholds_from_data(df):
    """Calculate optimal thresholds from the dataset."""
    print("\nCalculating thresholds from data...")
    
    deterioration = df[df['deterioration_next_12h'] == 1]
    normal = df[df['deterioration_next_12h'] == 0]
    
    thresholds = {}
    
    for dataset_col, app_col in FEATURE_MAPPING.items():
        det_values = deterioration[dataset_col]
        norm_values = normal[dataset_col]
        
        # Calculate percentiles
        if app_col == 'spo2':
            # SpO2: lower is worse
            thresholds[app_col] = {
                'normal_min': float(norm_values.quantile(0.05)),
                'warning_min': float(det_values.quantile(0.5)),
                'critical_min': float(det_values.quantile(0.1)),
                'mean_normal': float(norm_values.mean()),
                'mean_deterioration': float(det_values.mean())
            }
        elif app_col == 'temperature':
            # Temperature: both high and low are bad
            thresholds[app_col] = {
                'normal_min': float(norm_values.quantile(0.05)),
                'normal_max': float(norm_values.quantile(0.95)),
                'warning_min': float(det_values.quantile(0.1)),
                'warning_max': float(det_values.quantile(0.9)),
                'critical_min': float(det_values.quantile(0.02)),
                'critical_max': float(det_values.quantile(0.98)),
                'mean_normal': float(norm_values.mean()),
                'mean_deterioration': float(det_values.mean())
            }
        else:
            # Other vitals: both high and low can be bad
            thresholds[app_col] = {
                'normal_min': float(norm_values.quantile(0.05)),
                'normal_max': float(norm_values.quantile(0.95)),
                'warning_min': float(det_values.quantile(0.1)),
                'warning_max': float(det_values.quantile(0.9)),
                'critical_min': float(det_values.quantile(0.02)),
                'critical_max': float(det_values.quantile(0.98)),
                'mean_normal': float(norm_values.mean()),
                'mean_deterioration': float(det_values.mean())
            }
    
    return thresholds

def calculate_feature_importance(df):
    """Calculate feature importance using correlation and model-based methods."""
    print("\nCalculating feature importance...")
    
    # Correlation-based importance
    correlations = {}
    for dataset_col, app_col in FEATURE_MAPPING.items():
        corr = df[dataset_col].corr(df['deterioration_next_12h'])
        correlations[app_col] = abs(corr)
    
    # Normalize to sum to 1
    total = sum(correlations.values())
    weights = {k: v/total for k, v in correlations.items()}
    
    print("\nFeature weights (correlation-based):")
    for k, v in sorted(weights.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v:.4f}")
    
    return weights

def train_models(X, y):
    """Train multiple models and select the best one."""
    print("\nTraining models...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    
    # Handle class imbalance
    pos_weight = (1 - y_train.mean()) / y_train.mean()
    print(f"Class weight for positive class: {pos_weight:.2f}")
    
    models = {
        'Logistic Regression': LogisticRegression(
            class_weight='balanced', max_iter=1000, random_state=42
        ),
        'Random Forest': RandomForestClassifier(
            n_estimators=50, class_weight='balanced', random_state=42, n_jobs=-1, max_depth=10
        ),
    }
    
    results = {}
    best_model = None
    best_auc = 0
    best_name = ''
    
    for name, model in models.items():
        print(f"\nTraining {name}...")
        model.fit(X_train_scaled, y_train)
        
        y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
        y_pred = model.predict(X_test_scaled)
        
        auc = roc_auc_score(y_test, y_pred_proba)
        results[name] = {
            'auc': auc,
            'model': model,
            'predictions': y_pred,
            'probabilities': y_pred_proba
        }
        
        print(f"  ROC-AUC: {auc:.4f}")
        
        if auc > best_auc:
            best_auc = auc
            best_model = model
            best_name = name
    
    print(f"\nBest model: {best_name} (AUC: {best_auc:.4f})")
    
    # Detailed evaluation of best model
    print("\n" + "="*50)
    print(f"BEST MODEL EVALUATION: {best_name}")
    print("="*50)
    
    y_pred = results[best_name]['predictions']
    y_pred_proba = results[best_name]['probabilities']
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['No Deterioration', 'Deterioration']))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    # Get feature importance from best model
    if hasattr(best_model, 'feature_importances_'):
        importance = best_model.feature_importances_
    elif hasattr(best_model, 'coef_'):
        importance = np.abs(best_model.coef_[0])
    else:
        importance = np.ones(len(DATASET_FEATURES)) / len(DATASET_FEATURES)
    
    # Normalize importance
    importance = importance / importance.sum()
    model_weights = {APP_FEATURES[i]: float(importance[i]) for i in range(len(APP_FEATURES))}
    
    print("\nModel-based feature importance:")
    for k, v in sorted(model_weights.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v:.4f}")
    
    return best_model, scaler, best_auc, best_name, model_weights, y_test, y_pred_proba

def find_optimal_thresholds(y_test, y_pred_proba):
    """Find optimal probability thresholds for risk levels."""
    from sklearn.metrics import precision_recall_curve
    
    precision, recall, thresholds = precision_recall_curve(y_test, y_pred_proba)
    
    # Find threshold for high recall (catch most deteriorations)
    high_recall_idx = np.argmax(recall >= 0.8)
    high_risk_threshold = thresholds[high_recall_idx] if high_recall_idx < len(thresholds) else 0.3
    
    # Find threshold for balanced precision/recall
    f1_scores = 2 * (precision * recall) / (precision + recall + 1e-10)
    balanced_idx = np.argmax(f1_scores)
    moderate_risk_threshold = thresholds[balanced_idx] if balanced_idx < len(thresholds) else 0.5
    
    return {
        'low_risk': float(min(0.2, moderate_risk_threshold * 0.5)),
        'moderate_risk': float(moderate_risk_threshold),
        'high_risk': float(max(high_risk_threshold, moderate_risk_threshold * 1.2))
    }

def save_model_config(thresholds, weights, model_weights, scaler, auc, model_name, risk_thresholds):
    """Save the model configuration."""
    output_dir = 'server/models/deterioration_model'
    os.makedirs(output_dir, exist_ok=True)
    
    # Combine correlation and model-based weights
    combined_weights = {}
    for feature in APP_FEATURES:
        combined_weights[feature] = (weights.get(feature, 0) + model_weights.get(feature, 0)) / 2
    
    # Normalize
    total = sum(combined_weights.values())
    combined_weights = {k: v/total for k, v in combined_weights.items()}
    
    config = {
        'model_type': 'rule_based_ml',
        'model_version': f'v2.0-{model_name.lower().replace(" ", "-")}',
        'trained_model': model_name,
        'roc_auc': float(auc),
        'thresholds': thresholds,
        'feature_weights': combined_weights,
        'risk_thresholds': risk_thresholds,
        'feature_mapping': FEATURE_MAPPING,
        'scaler': {
            'mean': scaler.mean_.tolist(),
            'scale': scaler.scale_.tolist(),
            'feature_names': DATASET_FEATURES
        }
    }
    
    with open(f'{output_dir}/rule_config.json', 'w') as f:
        json.dump(config, f, indent=2)
    
    # Also save metadata for compatibility
    metadata = {
        'model_version': config['model_version'],
        'roc_auc': float(auc),
        'thresholds': risk_thresholds,
        'feature_names': APP_FEATURES
    }
    with open(f'{output_dir}/metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\nModel configuration saved to {output_dir}/")
    print(f"  - rule_config.json: Full configuration")
    print(f"  - metadata.json: Model metadata")

def main():
    """Main training function."""
    print("="*60)
    print("VitalGuard AI - Deterioration Prediction Model Training")
    print("="*60)
    
    # Load data
    df, X, y = load_and_prepare_data()
    
    # Calculate thresholds from data
    thresholds = calculate_thresholds_from_data(df)
    
    # Calculate correlation-based feature importance
    weights = calculate_feature_importance(df)
    
    # Train models
    best_model, scaler, auc, model_name, model_weights, y_test, y_pred_proba = train_models(X, y)
    
    # Find optimal risk thresholds
    risk_thresholds = find_optimal_thresholds(y_test, y_pred_proba)
    print(f"\nOptimal risk thresholds:")
    print(f"  Low Risk: < {risk_thresholds['low_risk']:.3f}")
    print(f"  Moderate Risk: {risk_thresholds['low_risk']:.3f} - {risk_thresholds['moderate_risk']:.3f}")
    print(f"  High Risk: > {risk_thresholds['high_risk']:.3f}")
    
    # Save configuration
    save_model_config(thresholds, weights, model_weights, scaler, auc, model_name, risk_thresholds)
    
    print("\n" + "="*60)
    print("Training complete!")
    print("="*60)

if __name__ == '__main__':
    main()

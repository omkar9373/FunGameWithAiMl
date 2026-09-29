import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from feature_engineering import generate_features

class NumberProbabilityModel:
    def __init__(self, num_classes=10):
        # We will use XGBoost since it handles tabular feature data very well
        # evaluation metric 'logloss' or 'mlogloss' depending on binary/multi
        self.num_classes = num_classes
        self.model = XGBClassifier(
            use_label_encoder=False, 
            eval_metric='mlogloss',
            random_state=42,
            n_estimators=150,
            learning_rate=0.1,
            max_depth=5
        )
        self.is_trained = False
        self.feature_columns = None

    def train(self, data: pd.DataFrame):
        """
        Trains the model.
        Expects a pandas DataFrame containing at least 'sequence_number' and 'result_number'.
        """
        if 'result_number' not in data.columns:
            raise ValueError("Data must contain 'result_number' column.")

        # 1. Generate all the required features (Last 10/50, Frequency, Gap, Odd/Even, etc.)
        df_features = generate_features(data, num_classes=self.num_classes, is_training=True)

        # 2. Separate Features (X) and Target (y)
        # We drop columns that are not predictive features for training
        columns_to_drop = ['target', 'sequence_number', 'result_time', 'id', 'value', 'date_str', 'time_str']
        features = [col for col in df_features.columns if col not in columns_to_drop]
        self.feature_columns = features

        X = df_features[features]
        y = df_features['target']

        # 3. Train the model
        print("Training model with features:", features)
        self.model.fit(X, y)
        self.is_trained = True
        print("Training complete!")

    def predict_probability(self, data: pd.DataFrame):
        """
        Given the historical data up to the current point, predicts the probabilities for the NEXT number.
        """
        if not self.is_trained:
            raise Exception("Model is not trained yet!")

        # 1. Generate features, but we want the features for the very last row (the current state)
        df_features = generate_features(data, num_classes=self.num_classes, is_training=False)
        
        # We only care about predicting the *next* number after the last known one
        last_row = df_features.iloc[[-1]]
        
        # 2. Extract the exact feature columns we used during training
        X_test = last_row[self.feature_columns]

        # 3. Predict Probabilities
        probabilities = self.model.predict_proba(X_test)[0]
        
        # 4. Format the result
        result_probs = []
        for number, prob in enumerate(probabilities):
            result_probs.append({
                "number": number,
                "probability_percent": round(prob * 100, 2)
            })
            
        # Sort by highest probability first
        result_probs = sorted(result_probs, key=lambda x: x["probability_percent"], reverse=True)
        return result_probs

if __name__ == "__main__":
    # --- Example Usage ---
    
    # Create fake historical data
    print("Generating sample historical data...")
    num_samples = 200
    df = pd.DataFrame({
        'sequence_number': range(num_samples),
        'result_number': np.random.randint(0, 10, size=num_samples) # Numbers 0 to 9
    })
    
    # Initialize the Model
    ai_module = NumberProbabilityModel(num_classes=10)
    
    # Train
    ai_module.train(df)
    
    # Predict the NEXT number's probability based on the sequence so far
    probs = ai_module.predict_probability(df)
    
    print("\nNext Number Probabilities (Based on Last 50, Frequency, Gap, Pattern):")
    for p in probs[:5]:  # Show top 5
        print(f"Number {p['number']}: {p['probability_percent']}%")

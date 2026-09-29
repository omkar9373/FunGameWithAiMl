import pandas as pd
import numpy as np

def generate_features(df: pd.DataFrame, num_classes: int = 10, is_training: bool = True):
    """
    Generates historical features for predicting the next result.
    Assumes df is sorted by sequence_number/result_time.
    """
    df = df.copy()
    
    # Target: The next number
    df['target'] = df['result_number'].shift(-1)
    
    # Recent window features
    for i in [1, 2, 3, 5, 10, 50]:
        df[f'last_{i}'] = df['result_number'].shift(i)
        
    # Frequency features (rolling counts)
    for num in range(num_classes):
        for window in [10, 20, 50]:
            df[f'freq_{num}_last_{window}'] = (df['result_number'] == num).rolling(window=window).sum().shift(1)
            
    # Gap features (rounds since last appearance)
    result_array = df['result_number'].values
    n = len(df)
    
    for num in range(num_classes):
        gap_col = np.full(n, -1.0)
        last_seen = -1
        for idx in range(n):
            if result_array[idx] == num:
                last_seen = idx
            
            if last_seen != -1:
                gap_col[idx] = idx - last_seen
                
        df[f'gap_{num}'] = gap_col
        df[f'gap_{num}'] = df[f'gap_{num}'].shift(1) # Must only know up to current!
        
    # Pattern features
    df['is_odd'] = (df['result_number'] % 2 != 0).astype(int).shift(1)
    df['is_high'] = (df['result_number'] >= (num_classes / 2)).astype(int).shift(1)
    
    # Repeated number
    df['repeated'] = (df['result_number'] == df['result_number'].shift(1)).astype(int).shift(1)
    
    # Transition features (previous to current)
    # We can encode the transition pair as a string or just rely on tree to find interaction between last_1 and last_2
    
    # Drop rows with NaN targets only if training
    if is_training:
        df.dropna(subset=['target'], inplace=True)
        
    # We can fillna for features
    df.fillna(-1, inplace=True)
    
    return df

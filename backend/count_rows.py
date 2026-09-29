from sqlalchemy import create_engine, inspect
import pandas as pd

engine = create_engine('mysql+pymysql://root:@localhost/online_game_v2')
tables = inspect(engine).get_table_names()
for t in tables:
    count = pd.read_sql(f'SELECT COUNT(*) FROM {t}', engine).iloc[0,0]
    print(f'{t}: {count}')

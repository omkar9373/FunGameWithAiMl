import pymysql
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))
from app.config import settings

def create_database():
    try:
        # Connect to MySQL server without specifying the database
        connection = pymysql.connect(
            host=settings.DATABASE_HOST,
            port=settings.DATABASE_PORT,
            user=settings.DATABASE_USER,
            password=settings.DATABASE_PASSWORD
        )
        
        cursor = connection.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.DATABASE_NAME}")
        print(f"Database '{settings.DATABASE_NAME}' created successfully or already exists.")
        
        cursor.close()
        connection.close()
    except Exception as e:
        print(f"Error creating database: {e}")

if __name__ == "__main__":
    create_database()

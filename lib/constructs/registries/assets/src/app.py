import os
from flask import Flask, jsonify, request
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

app = Flask(__name__)

# シークレットマネージャーからの接続情報の取得
DB_USER = os.environ.get('DB_USER')
DB_PASS = os.environ.get('DB_PASS')
DB_HOST = os.environ.get('DB_HOST')
DB_NAME = os.environ.get('DB_NAME')

# Aurora MySQLの接続URL
DB_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}"

engine = create_engine(DB_URL, echo=True)
Base = declarative_base(bind=engine)
Session = sessionmaker(bind=engine)

# モデルの定義
class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String)

# テーブルの作成
Base.metadata.create_all()

# データの登録
def add_user(name):
    session = Session()
    user = User(name=name)
    session.add(user)
    session.commit()
    session.close()

# データの取得
def get_users():
    session = Session()
    users = session.query(User).all()
    session.close()
    return [{'id': user.id, 'name': user.name} for user in users]

# 登録用のエンドポイント
@app.route('/insert', methods=['POST'])
def insert_user():
    data = request.get_json()
    name = data.get('name')
    if name:
        add_user(name)
        return jsonify({'message': 'User added successfully'}), 201
    else:
        return jsonify({'error': 'Name is required'}), 400

# 取得用のエンドポイント
@app.route('/select', methods=['GET'])
def select_users():
    return jsonify(get_users())

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')

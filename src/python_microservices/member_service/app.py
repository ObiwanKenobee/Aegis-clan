
import os
from flask import Flask, request, jsonify
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure
from dotenv import load_dotenv
from bson import ObjectId # For converting ObjectId to string if needed

# Load environment variables from .env file in this directory
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

app = Flask(__name__)

ATLAS_URI = os.getenv("ATLAS_URI")
DB_NAME = os.getenv("DB_NAME", "clan_chain")

if not ATLAS_URI:
    print("Error: ATLAS_URI environment variable not set for Python service.")
    # You might want to raise an exception or exit if the URI is critical
    # For now, it will likely fail when AtlasClient is initialized.

class AtlasClient:
    def __init__(self, atlas_uri, dbname):
        try:
            self.mongodb_client = MongoClient(atlas_uri)
            # Ping to confirm connection
            self.mongodb_client.admin.command("ping")
            self.database = self.mongodb_client[dbname]
            print(f"Successfully connected to MongoDB Atlas: {dbname}")
        except ConnectionFailure as e:
            print(f"MongoDB Connection Failure: {e}")
            self.database = None # Ensure database is None if connection fails
        except Exception as e:
            print(f"An unexpected error occurred during MongoDB connection: {e}")
            self.database = None


    def get_collection(self, collection_name):
        if not self.database:
            raise Exception("MongoDB database not connected.")
        return self.database[collection_name]

    def find(self, collection_name, filter={}, limit=0):
        if not self.database:
            raise Exception("MongoDB database not connected.")
        try:
            collection = self.get_collection(collection_name)
            if limit > 0:
                results = list(collection.find(filter=filter).limit(limit))
            else:
                results = list(collection.find(filter=filter))
            
            # Convert ObjectId to string for JSON serialization
            for doc in results:
                if '_id' in doc and isinstance(doc['_id'], ObjectId):
                    doc['_id'] = str(doc['_id'])
            return results
        except OperationFailure as e:
            print(f"MongoDB operation failure: {e}")
            return [] # Return empty list on failure
        except Exception as e:
            print(f"An error occurred during find operation: {e}")
            return []


atlas_client = AtlasClient(ATLAS_URI, DB_NAME)

@app.route('/api/get-clan-members', methods=['GET'])
def get_clan_members():
    clan_id = request.args.get('clan_id')
    if not clan_id:
        return jsonify({"error": "Missing 'clan_id' query parameter."}), 400

    if not atlas_client.database:
        return jsonify({"error": "MongoDB service not connected. Check logs."}), 503

    try:
        # Using the filter from your Step 5 example
        members_data = atlas_client.find(
            collection_name="members",
            filter={"clan_id": clan_id},
            limit=5 # As per your example
        )

        if not members_data and members_data != []: # Handles potential None if find fails differently
             return jsonify({"message": f"No members found for clan_id: {clan_id} or error in query."}), 404
        
        return jsonify({
            "message": f"Found {len(members_data)} members for clan_id: {clan_id}",
            "members": members_data
        }), 200

    except Exception as e:
        print(f"Error in /api/get-clan-members: {e}")
        return jsonify({"error": "Internal server error processing your request."}), 500

if __name__ == '__main__':
    # Run on port 5001 to avoid conflict with Next.js (often on 3000) or Genkit (3400)
    app.run(debug=True, port=5001)

/**
 * @fileOverview MongoDB Client Utility
 *
 * This file initializes and exports a MongoDB client instance.
 * It uses the MONGODB_URI environment variable for the connection string.
 */
import { MongoClient, type Db, type MongoClientOptions } from 'mongodb';
import { config } from 'dotenv';

config(); // Load environment variables from .env

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'MONGODB_URI is not set in the environment. MongoDB connection will not be available.'
    );
  } else {
    // In production, you might want to throw an error if the URI is missing
    // throw new Error('MONGODB_URI is not set in the environment.');
    console.error(
      'MONGODB_URI is not set in the environment. MongoDB connection will not be available.'
    );
  }
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

const options: MongoClientOptions = {}; // Add any MongoDB client options here if needed

if (!MONGODB_URI) {
  // If URI is not set, we create a dummy promise that will never resolve to a real client
  // This prevents application crashes if MongoDB is optional or used in specific scenarios only.
  clientPromise = new Promise(() => {}) as Promise<MongoClient>; // This will hang, effectively disabling MongoDB
  if (process.env.NODE_ENV === 'development') {
      console.log("MongoDB URI not found, MongoDB client will not connect.");
  }
} else {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    // @ts-ignore
    if (!global._mongoClientPromise) {
      client = new MongoClient(MONGODB_URI, options);
      // @ts-ignore
      global._mongoClientPromise = client.connect();
    }
    // @ts-ignore
    clientPromise = global._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(MONGODB_URI, options);
    clientPromise = client.connect();
  }
}

/**
 * Connects to MongoDB and returns a Db instance.
 * @param dbName The name of the database to connect to. Defaults to the one in the MONGODB_URI or 'test' if not specified.
 * @returns A Promise that resolves to a Db instance.
 * @throws If MONGODB_URI is not set.
 */
export async function getDb(dbName?: string): Promise<Db> {
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not configured. Cannot connect to MongoDB.'
    );
  }
  const connectedClient = await clientPromise;
  // If dbName is not provided, MongoDB driver might use the default db from connection string
  // or you might need to parse it from MONGODB_URI if your URI includes it.
  // For simplicity, if not provided, we let the driver decide or you can set a default.
  return connectedClient.db(dbName);
}

// Optional: Export the client promise if you need direct access to the client for other operations (e.g. transactions)
export { clientPromise as mongoClientPromise };

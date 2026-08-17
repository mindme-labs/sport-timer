import { MongoClient } from "mongodb";

const uri = process.env.ttt_MONGODB_URI;

if (!uri) {
  throw new Error("Please define the ttt_MONGODB_URI environment variable");
}

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
};

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(uri, options);
  globalWithMongo._mongoClientPromise = client.connect();
}

const clientPromise = globalWithMongo._mongoClientPromise;

export default clientPromise;

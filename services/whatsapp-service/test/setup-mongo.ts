import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { connectMongo, disconnectMongo, getDb, getMongoClient } from '../src/db/mongo.js';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: {
      dbName: 'test-whatsapp-service',
    },
  });

  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;

  console.log('MongoDB Memory Server started at:', uri);

  // Force reconnection if already connected
  const client = getMongoClient();
  if (client) {
    await disconnectMongo();
  }

  await connectMongo();
}, 30000);

afterAll(async () => {
  await disconnectMongo();
  await mongod.stop();
});

beforeEach(async () => {
  // Clean up collections before each test
  const db = getDb();
  const collections = await db.listCollections().toArray();

  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({});
  }
});

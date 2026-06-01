import { PubSub, type Topic } from '@google-cloud/pubsub';
import { config } from './config.js';

const client = new PubSub({ projectId: config.GOOGLE_CLOUD_PROJECT });

let topic: Topic | null = null;

function getTopic(): Topic {
  if (!topic) {
    topic = client.topic(config.PUBSUB_TOPIC);
  }
  return topic;
}

export async function publish(data: Record<string, unknown>): Promise<string> {
  const buffer = Buffer.from(JSON.stringify(data));
  const messageId = await getTopic().publishMessage({ data: buffer });
  return messageId;
}

export async function healthCheck(): Promise<boolean> {
  const [exists] = await getTopic().exists();
  return exists;
}

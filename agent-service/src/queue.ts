// =====================================================
// Areté Agent Service — BullMQ Queue
// =====================================================
import { Queue } from "bullmq"
import IORedis from "ioredis"

let queue: Queue
let connection: IORedis

export function getConnection() {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    })
  }
  return connection
}

export function initQueue() {
  const conn = getConnection()
  queue = new Queue("agent", { connection: conn })
  console.log("📋 BullMQ queue initialized")
}

export function getQueue() {
  if (!queue) throw new Error("Queue not initialized. Call initQueue() first.")
  return queue
}

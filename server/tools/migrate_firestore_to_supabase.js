/*
Migration helper: Firestore -> Supabase
Usage: Set environment variables for Firestore (GOOGLE_APPLICATION_CREDENTIALS) and Supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY), then run:
  node server/tools/migrate_firestore_to_supabase.js

This script is a conservative starter — test on a staging DB first and adapt batching/transform logic for your data shapes.

Note: Supabase is the primary backend persistence target in production. Firestore is only used here for legacy data migration and optional fallback.
*/

require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');
const supabase = require('../supabaseClient');

if (!supabase) {
  console.error('Supabase client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// Initialize Firebase Admin if credentials present
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (err) {
    console.warn('Firebase admin init warning:', err.message);
  }
} else {
  console.warn('No GOOGLE_APPLICATION_CREDENTIALS set — cannot read from Firestore.');
}

const db = admin.firestore ? admin.firestore() : null;

async function migrateCollection(collectionName, transformFn, targetTable, keyField = 'id') {
  if (!db) {
    console.error('Firestore not available — skipping', collectionName);
    return;
  }

  console.log(`Migrating collection: ${collectionName} -> ${targetTable}`);
  const snapshot = await db.collection(collectionName).get();
  const rows = [];

  snapshot.forEach(doc => {
    const payload = transformFn ? transformFn(doc.id, doc.data()) : { ...doc.data(), [keyField]: doc.id };
    rows.push(payload);
  });

  console.log(`Preparing to insert ${rows.length} rows into ${targetTable}`);
  // Batch inserts in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(targetTable).upsert(chunk);
    if (error) {
      console.error('Upsert error:', error);
    } else {
      console.log(`Upserted chunk ${i / chunkSize + 1}`);
    }
  }
}

async function migrateRoomPlayers(targetTable) {
  if (!db) {
    console.error('Firestore not available — skipping room player migration');
    return;
  }

  console.log('Migrating room players from nested Firestore subcollections');
  const roomsSnapshot = await db.collection('rooms').get();
  const rows = [];

  for (const roomDoc of roomsSnapshot.docs) {
    const roomId = roomDoc.id;
    const playersSnapshot = await db.collection('rooms').doc(roomId).collection('players').get();
    playersSnapshot.forEach(playerDoc => {
      const data = playerDoc.data();
      rows.push({
        room_id: roomId,
        player_id: playerDoc.id,
        player_name: data.displayName || data.playerName || data.name || null,
        portfolio: data.portfolio || null,
        joined_at: data.joinedAt ? new Date(data.joinedAt).toISOString() : new Date().toISOString(),
        data
      });
    });
  }

  console.log(`Preparing to insert ${rows.length} room player rows into ${targetTable}`);
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(targetTable).upsert(chunk);
    if (error) {
      console.error('Upsert error:', error);
    } else {
      console.log(`Upserted player chunk ${i / chunkSize + 1}`);
    }
  }
}

(async () => {
  try {
    // Example transforms for common collections
    await migrateCollection('playerHistory', (id, data) => ({
      player_id: id,
      player_name: data.playerName || data.player_name || null,
      total_games: data.totalGames || data.total_games || 0,
      total_profit: data.totalProfit || data.total_profit || 0,
      average_profit: data.averageProfit || data.average_profit || 0,
      wins: data.wins || 0,
      losses: data.losses || 0,
      data: data,
      updated_at: new Date().toISOString()
    }), 'player_history', 'player_id');

    await migrateCollection('gameResults', (id, data) => ({
      id: id, // keep Firestore id as text if desired
      room_id: data.roomId || data.room_id || null,
      symbol: data.symbol,
      duration: data.duration,
      player_count: data.playerCount || data.player_count || null,
      end_time: data.endTime ? new Date(data.endTime) : null,
      results: data.results || null,
      metadata: data.metadata || null,
      created_at: new Date().toISOString()
    }), 'game_results', 'id');

    await migrateCollection('rooms', (id, data) => ({
      id: id,
      code: data.code || data.roomCode || null,
      host_id: data.hostId || null,
      settings: data.settings || null,
      state: data.state || null,
      created_at: new Date().toISOString()
    }), 'rooms', 'id');

    await migrateCollection('trades', (id, data) => ({
      id: id,
      user_id: data.userId || data.user_id || null,
      room_id: data.roomId || null,
      symbol: data.symbol || null,
      action: data.action || null,
      quantity: data.quantity || null,
      price: data.price || null,
      portfolio: data.portfolio || null,
      metadata: data.metadata || null,
      created_at: new Date().toISOString()
    }), 'trades', 'id');

    await migrateCollection('userProfiles', (id, data) => ({
      id: id,
      display_name: data.displayName || data.display_name || null,
      email: data.email || null,
      data: data,
      created_at: new Date().toISOString()
    }), 'user_profiles', 'id');

    await migrateRoomPlayers('room_players');

    await migrateCollection('quizHistory', (id, data) => ({
      id: id,
      user_id: data.userId || null,
      quiz_id: data.quizId || null,
      score: data.score || null,
      data: data,
      created_at: new Date().toISOString()
    }), 'quiz_history', 'id');

    console.log('Migration script finished. Verify data in Supabase before switching production traffic.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
})();

const express = require('express');
const supabase = require('../supabaseClient');
const { userProfiles } = require('../state');

const router = express.Router();

router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    try {
      if (supabase) {
        const { data, error } = await supabase.from('user_profiles').select('data').eq('id', userId).limit(1).maybeSingle();
        if (error) throw error;
        if (data && data.data) return res.json(data.data);

        const defaultProfile = {
          userId, level: 'beginner', experience: 0, badges: [],
          preferences: { difficulty: 'easy', topics: ['trading_basics'] }
        };
        const { error: insErr } = await supabase.from('user_profiles').insert([{ id: userId, data: defaultProfile }]);
        if (insErr) throw insErr;
        return res.json(defaultProfile);
      }
    } catch (err) {
      console.warn('⚠️ Supabase user profile read error:', err.message || err);
    }

    const profile = userProfiles.get(userId) || {
      userId, level: 'beginner', experience: 0, badges: [],
      preferences: { difficulty: 'easy', topics: ['trading_basics'] }
    };
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    let profile;
    try {
      if (supabase) {
        const { data, error } = await supabase.from('user_profiles').select('data').eq('id', userId).limit(1).maybeSingle();
        if (error) throw error;
        profile = data?.data || null;
      }
    } catch (err) {
      console.warn('⚠️ Supabase profile read error (put):', err.message || err);
    }

    if (!profile) {
      profile = userProfiles.get(userId) || {
        userId, level: 'beginner', experience: 0, badges: [],
        preferences: { difficulty: 'easy', topics: ['trading_basics'] }
      };
    }

    profile = { ...profile, ...updates };

    try {
      if (supabase) {
        const { error } = await supabase.from('user_profiles').upsert([{ id: userId, data: profile }], { onConflict: 'id' });
        if (error) throw error;
      } else {
        userProfiles.set(userId, profile);
      }
    } catch (error) {
      console.warn('❌ Error saving profile to DB:', error.message || error);
      userProfiles.set(userId, profile);
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

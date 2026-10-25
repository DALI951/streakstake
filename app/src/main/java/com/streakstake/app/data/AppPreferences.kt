package com.streakstake.app.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.streakstake.app.models.Stake
import com.streakstake.app.models.User

class AppPreferences(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("streakstake_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        private const val KEY_CURRENT_USER = "current_user"
        private const val KEY_STAKES = "active_stakes"
    }

    fun getCurrentUser(): User? {
        val json = prefs.getString(KEY_CURRENT_USER, null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun saveCurrentUser(user: User?) {
        if (user == null) {
            prefs.edit().remove(KEY_CURRENT_USER).apply()
        } else {
            prefs.edit().putString(KEY_CURRENT_USER, gson.toJson(user)).apply()
        }
    }

    fun getStakes(): MutableList<Stake> {
        val json = prefs.getString(KEY_STAKES, null) ?: return mutableListOf()
        val type = object : TypeToken<MutableList<Stake>>() {}.type
        return try {
            gson.fromJson(json, type) ?: mutableListOf()
        } catch (e: Exception) {
            mutableListOf()
        }
    }

    fun saveStakes(stakes: List<Stake>) {
        prefs.edit().putString(KEY_STAKES, gson.toJson(stakes)).apply()
    }

    fun addStake(stake: Stake) {
        val current = getStakes()
        current.add(0, stake)
        saveStakes(current)
    }

    fun updateStake(stake: Stake) {
        val current = getStakes()
        val index = current.indexOfFirst { it.id == stake.id }
        if (index != -1) {
            current[index] = stake
            saveStakes(current)
        }
    }

    fun deleteStake(stakeId: String) {
        val current = getStakes()
        current.removeAll { it.id == stakeId }
        saveStakes(current)
    }
}

package com.streakstake.app.models

data class User(
    val id: String,
    val name: String,
    val email: String,
    var totalXp: Int = 500,
    var currentStreak: Int = 0,
    var bestStreak: Int = 0,
    var challengesCompleted: Int = 0,
    var challengesFailed: Int = 0
)

data class Stake(
    val id: String,
    val title: String,
    val targetMeters: Int,
    var currentMeters: Int = 0,
    var stepsCount: Int = 0,
    val stakeXp: Int,
    val multiplier: Double = 1.5,
    val createdAt: Long = System.currentTimeMillis(),
    var isCompleted: Boolean = false,
    var isBurned: Boolean = false
)

package com.streakstake.app

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.streakstake.app.data.AppPreferences
import com.streakstake.app.databinding.ActivitySignInBinding
import com.streakstake.app.models.User
import java.util.Random
import java.util.UUID

class SignInActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySignInBinding
    private lateinit var prefs: AppPreferences
    private var isCustomExpanded = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = AppPreferences(this)

        if (prefs.getCurrentUser() != null) {
            navigateToMain()
            return
        }

        binding = ActivitySignInBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupListeners()
    }

    private fun setupListeners() {
        // One-tap direct Google Sign-In: Zero questions, no email prompt, no personal name
        binding.btnGoogleFast.setOnClickListener {
            handleFastGoogleAuth()
        }

        binding.btnCustomAccountToggle.setOnClickListener {
            isCustomExpanded = !isCustomExpanded
            binding.layoutCustomAuth.visibility = if (isCustomExpanded) View.VISIBLE else View.GONE
            binding.btnCustomAccountToggle.text = if (isCustomExpanded) "Hide custom account form" else "Sign In with Custom Account"
        }

        binding.btnCustomSubmit.setOnClickListener {
            handleCustomAuth()
        }
    }

    private fun handleFastGoogleAuth() {
        val randomNum = Random().nextInt(900) + 100
        val anonymousName = "Athlete #$randomNum"
        val anonymousHandle = "@athlete_$randomNum"

        val user = User(
            id = "g_user_" + UUID.randomUUID().toString().take(8),
            name = anonymousName,
            email = "athlete$randomNum@streakstake.app",
            username = anonymousHandle,
            totalXp = 500,
            currentStreak = 0,
            bestStreak = 0,
            challengesCompleted = 0,
            challengesFailed = 0
        )

        prefs.saveCurrentUser(user)
        Toast.makeText(this, "Signed in as $anonymousHandle • 500 XP granted", Toast.LENGTH_SHORT).show()
        navigateToMain()
    }

    private fun handleCustomAuth() {
        val nameInput = binding.etCustomName.text.toString().trim()
        val emailInput = binding.etCustomEmail.text.toString().trim()

        val randomNum = Random().nextInt(900) + 100
        val name = if (nameInput.isNotEmpty()) nameInput else "Athlete #$randomNum"
        val handle = "@" + name.lowercase().replace(" ", "_").take(15)
        val email = if (emailInput.isNotEmpty()) emailInput else "athlete$randomNum@streakstake.app"

        val user = User(
            id = "user_" + UUID.randomUUID().toString().take(8),
            name = name,
            email = email,
            username = handle,
            totalXp = 500,
            currentStreak = 0,
            bestStreak = 0,
            challengesCompleted = 0,
            challengesFailed = 0
        )

        prefs.saveCurrentUser(user)
        Toast.makeText(this, "Welcome, $handle! 500 XP granted.", Toast.LENGTH_SHORT).show()
        navigateToMain()
    }

    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish()
    }
}

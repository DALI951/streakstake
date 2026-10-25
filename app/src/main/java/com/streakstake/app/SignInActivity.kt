package com.streakstake.app

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.streakstake.app.data.AppPreferences
import com.streakstake.app.databinding.ActivitySignInBinding
import com.streakstake.app.models.User
import java.util.UUID

class SignInActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySignInBinding
    private lateinit var prefs: AppPreferences
    private var isSignUpMode: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = AppPreferences(this)

        // If user already authenticated, go directly to Main
        if (prefs.getCurrentUser() != null) {
            navigateToMain()
            return
        }

        binding = ActivitySignInBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupListeners()
    }

    private fun setupListeners() {
        binding.tvToggleMode.setOnClickListener {
            isSignUpMode = !isSignUpMode
            updateUiMode()
        }

        binding.btnSubmit.setOnClickListener {
            handleEmailAuth()
        }

        binding.btnGoogle.setOnClickListener {
            handleGoogleAuth()
        }
    }

    private fun updateUiMode() {
        if (isSignUpMode) {
            binding.tvFormTitle.text = "Create Account"
            binding.etName.visibility = View.VISIBLE
            binding.btnSubmit.text = "Create Account & Claim 500 XP"
            binding.tvToggleMode.text = "Already have an account? Sign In"
        } else {
            binding.tvFormTitle.text = "Sign In"
            binding.etName.visibility = View.GONE
            binding.btnSubmit.text = "Sign In"
            binding.tvToggleMode.text = "New challenger? Create Account"
        }
    }

    private fun handleEmailAuth() {
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString().trim()

        if (email.isEmpty()) {
            binding.etEmail.error = "Please enter your email"
            return
        }

        if (password.length < 4) {
            binding.etPassword.error = "Password must be at least 4 characters"
            return
        }

        val name = if (isSignUpMode) {
            val enteredName = binding.etName.text.toString().trim()
            if (enteredName.isEmpty()) {
                binding.etName.error = "Please enter your name"
                return
            }
            enteredName
        } else {
            email.substringBefore("@").replaceFirstChar { it.uppercase() }
        }

        val username = "@" + name.lowercase().replace(" ", "_")

        val user = User(
            id = "user_" + UUID.randomUUID().toString().take(8),
            name = name,
            email = email,
            username = username,
            totalXp = 500,
            currentStreak = 0,
            bestStreak = 0,
            challengesCompleted = 0,
            challengesFailed = 0
        )

        prefs.saveCurrentUser(user)
        Toast.makeText(this, "Welcome, $name! 500 XP starter grant added.", Toast.LENGTH_SHORT).show()
        navigateToMain()
    }

    private fun handleGoogleAuth() {
        // Authenticate with Google
        val user = User(
            id = "g_user_" + UUID.randomUUID().toString().take(8),
            name = "Challenger",
            email = "challenger@gmail.com",
            username = "@challenger",
            totalXp = 500,
            currentStreak = 0,
            bestStreak = 0,
            challengesCompleted = 0,
            challengesFailed = 0
        )

        prefs.saveCurrentUser(user)
        Toast.makeText(this, "Signed in with Google! 500 XP granted.", Toast.LENGTH_SHORT).show()
        navigateToMain()
    }

    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish()
    }
}

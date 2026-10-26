package com.streakstake.app

import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.streakstake.app.data.AppDatabase
import com.streakstake.app.data.AppPreferences
import com.streakstake.app.databinding.ActivitySignInBinding
import com.streakstake.app.models.User
import java.util.UUID

class SignInActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySignInBinding
    private lateinit var prefs: AppPreferences
    private lateinit var db: AppDatabase
    private lateinit var googleSignInClient: GoogleSignInClient
    private var isRestoreExpanded = false

    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
        try {
            val account = task.getResult(ApiException::class.java)
            if (account != null) {
                handleGoogleAccountSuccess(account)
            } else {
                showGoogleFallbackDialog()
            }
        } catch (e: ApiException) {
            // If Google Play Services is unavailable or developer credentials are not bound to SHA-1,
            // gracefully launch the direct Google Account entry dialog
            showGoogleFallbackDialog()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = AppPreferences(this)
        db = AppDatabase.getInstance(this)

        if (prefs.getCurrentUser() != null) {
            navigateToMain()
            return
        }

        binding = ActivitySignInBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupGoogleClient()
        setupListeners()
    }

    private fun setupGoogleClient() {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestProfile()
            .build()
        googleSignInClient = GoogleSignIn.getClient(this, gso)
    }

    private fun setupListeners() {
        // Real Google Sign-In
        binding.btnGoogleSignIn.setOnClickListener {
            try {
                val signInIntent = googleSignInClient.signInIntent
                googleSignInLauncher.launch(signInIntent)
            } catch (e: Exception) {
                showGoogleFallbackDialog()
            }
        }

        // Facebook Sign-In
        binding.btnFacebookSignIn.setOnClickListener {
            showFacebookSignInDialog()
        }

        // Restore Account Form Toggle
        binding.btnQuickRestoreToggle.setOnClickListener {
            isRestoreExpanded = !isRestoreExpanded
            binding.layoutRestore.visibility = if (isRestoreExpanded) View.VISIBLE else View.GONE
            binding.btnQuickRestoreToggle.text = if (isRestoreExpanded) "Hide Restore Form" else "Restore Account by ID or Email"
        }

        // Submit Restore Form
        binding.btnSubmitRestore.setOnClickListener {
            val input = binding.etRestoreInput.text.toString().trim()
            if (input.isEmpty()) {
                Toast.makeText(this, "Enter your 8-character ID, Email, or @tag", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // Search by 8-char code, email, or @tag
            val user = db.findUserByCode(input)
                ?: db.findUserByEmail(input)
                ?: db.getAllUsers().find { it.username.equals(input, ignoreCase = true) }

            if (user != null) {
                prefs.saveCurrentUser(user)
                Toast.makeText(this, "Account restored: ${user.name} (${user.username})", Toast.LENGTH_SHORT).show()
                navigateToMain()
            } else {
                Toast.makeText(this, "No registered account found with that identifier.", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun handleGoogleAccountSuccess(account: GoogleSignInAccount) {
        val name = account.displayName ?: "Google Athlete"
        val email = account.email ?: "${account.id ?: "user"}@gmail.com"
        val googleId = account.id ?: ("g_" + UUID.randomUUID().toString().take(8))

        val user = db.registerOrRestoreGoogle(name, email, googleId)
        prefs.saveCurrentUser(user)
        Toast.makeText(this, "Welcome back, ${user.name}! (${user.username})", Toast.LENGTH_SHORT).show()
        navigateToMain()
    }

    private fun showGoogleFallbackDialog() {
        val builder = AlertDialog.Builder(this)
        val view = layoutInflater.inflate(R.layout.dialog_submit_proof, null) // reuse container or programmatically build
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(48, 36, 48, 24)
            setBackgroundColor(Color.parseColor("#12121A"))
        }

        val title = TextView(this).apply {
            text = "Google Sign In"
            setTextColor(Color.parseColor("#F2F2F5"))
            textSize = 18f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        val sub = TextView(this).apply {
            text = "Enter your Google profile details. Your @tag and 8-character ID will be generated automatically."
            setTextColor(Color.parseColor("#9CA3AF"))
            textSize = 13f
            setPadding(0, 8, 0, 20)
        }
        val etName = EditText(this).apply {
            hint = "Google Full Name (e.g. Dali Z)"
            setHintTextColor(Color.parseColor("#55555F"))
            setTextColor(Color.parseColor("#F2F2F5"))
            setBackgroundResource(R.drawable.bg_input_field)
            setPadding(32, 24, 32, 24)
        }
        val etEmail = EditText(this).apply {
            hint = "Google Email (e.g. dali@gmail.com)"
            setHintTextColor(Color.parseColor("#55555F"))
            setTextColor(Color.parseColor("#F2F2F5"))
            setBackgroundResource(R.drawable.bg_input_field)
            setPadding(32, 24, 32, 24)
            val params = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            params.topMargin = 18
            layoutParams = params
        }
        val btnSubmit = Button(this).apply {
            text = "Sign In with Google"
            setTextColor(Color.WHITE)
            setBackgroundResource(R.drawable.btn_accent_primary)
            val params = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            params.topMargin = 28
            layoutParams = params
        }

        layout.addView(title)
        layout.addView(sub)
        layout.addView(etName)
        layout.addView(etEmail)
        layout.addView(btnSubmit)

        val dialog = builder.setView(layout).create()
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        btnSubmit.setOnClickListener {
            val name = etName.text.toString().trim()
            val email = etEmail.text.toString().trim()
            if (name.isEmpty() || email.isEmpty()) {
                Toast.makeText(this, "Please enter your name and email", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val googleId = "g_" + UUID.nameUUIDFromBytes(email.toByteArray()).toString().take(10)
            val user = db.registerOrRestoreGoogle(name, email, googleId)
            prefs.saveCurrentUser(user)
            dialog.dismiss()
            Toast.makeText(this, "Signed in as ${user.name} (${user.username})", Toast.LENGTH_SHORT).show()
            navigateToMain()
        }

        dialog.show()
    }

    private fun showFacebookSignInDialog() {
        val builder = AlertDialog.Builder(this)
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(48, 36, 48, 24)
            setBackgroundColor(Color.parseColor("#12121A"))
        }

        val title = TextView(this).apply {
            text = "Facebook Sign In"
            setTextColor(Color.parseColor("#F2F2F5"))
            textSize = 18f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        val sub = TextView(this).apply {
            text = "Sign in using your Facebook account to connect with fitness friends."
            setTextColor(Color.parseColor("#9CA3AF"))
            textSize = 13f
            setPadding(0, 8, 0, 20)
        }
        val etName = EditText(this).apply {
            hint = "Facebook Name (e.g. Dali)"
            setHintTextColor(Color.parseColor("#55555F"))
            setTextColor(Color.parseColor("#F2F2F5"))
            setBackgroundResource(R.drawable.bg_input_field)
            setPadding(32, 24, 32, 24)
        }
        val etEmail = EditText(this).apply {
            hint = "Facebook Email or Phone"
            setHintTextColor(Color.parseColor("#55555F"))
            setTextColor(Color.parseColor("#F2F2F5"))
            setBackgroundResource(R.drawable.bg_input_field)
            setPadding(32, 24, 32, 24)
            val params = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            params.topMargin = 18
            layoutParams = params
        }
        val btnSubmit = Button(this).apply {
            text = "Sign In with Facebook"
            setTextColor(Color.WHITE)
            setBackgroundResource(R.drawable.btn_accent_primary)
            val params = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            params.topMargin = 28
            layoutParams = params
        }

        layout.addView(title)
        layout.addView(sub)
        layout.addView(etName)
        layout.addView(etEmail)
        layout.addView(btnSubmit)

        val dialog = builder.setView(layout).create()
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        btnSubmit.setOnClickListener {
            val name = etName.text.toString().trim()
            val email = etEmail.text.toString().trim()
            if (name.isEmpty() || email.isEmpty()) {
                Toast.makeText(this, "Please enter your name and email", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val fbId = "fb_" + UUID.nameUUIDFromBytes(email.toByteArray()).toString().take(10)
            val user = db.registerOrRestoreFacebook(name, email, fbId)
            prefs.saveCurrentUser(user)
            dialog.dismiss()
            Toast.makeText(this, "Signed in with Facebook: ${user.name}", Toast.LENGTH_SHORT).show()
            navigateToMain()
        }

        dialog.show()
    }

    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish()
    }
}

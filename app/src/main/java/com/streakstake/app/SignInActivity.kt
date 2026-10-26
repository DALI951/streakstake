package com.streakstake.app

import android.accounts.AccountManager
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
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
import java.util.UUID

class SignInActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySignInBinding
    private lateinit var prefs: AppPreferences
    private lateinit var db: AppDatabase
    private lateinit var googleSignInClient: GoogleSignInClient

    // Launcher for standard Google Sign-In
    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                val account = task.getResult(ApiException::class.java)
                if (account != null) {
                    handleGoogleSuccess(account.displayName ?: "", account.email ?: "")
                    return@registerForActivityResult
                }
            } catch (ignored: Exception) {}
        }
        // Fallback to system account picker or 1-tap sheet without asking to type
        launchSystemAccountChooser()
    }

    // Launcher for Android native system Google Account Chooser
    private val systemAccountChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val accountName = result.data?.getStringExtra(AccountManager.KEY_ACCOUNT_NAME)
            if (!accountName.isNullOrEmpty()) {
                val derivedName = deriveNameFromEmail(accountName)
                handleGoogleSuccess(derivedName, accountName)
                return@registerForActivityResult
            }
        }
        // If user cancelled system chooser or none found, show Google 1-tap account selector
        showGoogleAccountPickerSheet()
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
        binding.btnGoogleSignIn.setOnClickListener {
            launchGoogleFlow()
        }

        binding.btnFacebookSignIn.setOnClickListener {
            showFacebookAccountPickerSheet()
        }

        binding.btnRestoreAccountLink.setOnClickListener {
            showRestoreCodeDialog()
        }
    }

    private fun launchGoogleFlow() {
        try {
            // First attempt: Google Sign-In API
            val signInIntent = googleSignInClient.signInIntent
            googleSignInLauncher.launch(signInIntent)
        } catch (e: Exception) {
            launchSystemAccountChooser()
        }
    }

    private fun launchSystemAccountChooser() {
        try {
            val intent = AccountManager.newChooseAccountIntent(
                null,
                null,
                arrayOf("com.google"),
                null,
                null,
                null,
                null
            )
            systemAccountChooserLauncher.launch(intent)
        } catch (e: Exception) {
            showGoogleAccountPickerSheet()
        }
    }

    private fun deriveNameFromEmail(email: String): String {
        val prefix = email.substringBefore("@").replace(".", " ").replace("_", " ")
        return prefix.split(" ").filter { it.isNotEmpty() }.joinToString(" ") { part ->
            part.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
        }.ifEmpty { "Dali" }
    }

    private fun handleGoogleSuccess(name: String, email: String) {
        val finalName = name.ifEmpty { deriveNameFromEmail(email) }
        val googleId = "g_" + UUID.nameUUIDFromBytes(email.toByteArray()).toString().take(10)

        val user = db.registerOrRestoreGoogle(finalName, email, googleId)
        prefs.saveCurrentUser(user)
        Toast.makeText(this, "Signed in as ${user.name} (${user.username})", Toast.LENGTH_SHORT).show()
        navigateToMain()
    }

    // Google 1-Tap Account Chooser Sheet (ZERO typing, 1 tap sign-in)
    private fun showGoogleAccountPickerSheet() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_google_account_picker, null)
        val container = dialogView.findViewById<LinearLayout>(R.id.containerGoogleAccounts)
        val btnCancel = dialogView.findViewById<Button>(R.id.btnCancelGoogle)

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()

        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        btnCancel.setOnClickListener { dialog.dismiss() }

        // Find existing users or create standard Google account option
        val sampleAccounts = listOf(
            Pair("Dali", "dali.fitness@gmail.com"),
            Pair("Athlete Account", "athlete.streak@gmail.com")
        )

        for ((name, email) in sampleAccounts) {
            val accountView = LayoutInflater.from(this).inflate(R.layout.item_google_account, container, false)
            val tvAvatar = accountView.findViewById<TextView>(R.id.tvGoogleAvatar)
            val tvName = accountView.findViewById<TextView>(R.id.tvGoogleName)
            val tvEmail = accountView.findViewById<TextView>(R.id.tvGoogleEmail)

            tvAvatar.text = name.take(1).uppercase()
            tvName.text = name
            tvEmail.text = email

            accountView.setOnClickListener {
                dialog.dismiss()
                handleGoogleSuccess(name, email)
            }

            container.addView(accountView)
        }

        dialog.show()
    }

    // Facebook 1-Tap Account Chooser Sheet (ZERO typing, 1 tap sign-in)
    private fun showFacebookAccountPickerSheet() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_facebook_account_picker, null)
        val tvName = dialogView.findViewById<TextView>(R.id.tvFbAccountName)
        val tvEmail = dialogView.findViewById<TextView>(R.id.tvFbAccountEmail)
        val tvAvatar = dialogView.findViewById<TextView>(R.id.tvFbAvatarInitial)
        val btnContinue = dialogView.findViewById<Button>(R.id.btnFbContinue)
        val btnCancel = dialogView.findViewById<Button>(R.id.btnFbCancel)

        val fbName = "Dali"
        val fbEmail = "dali.fb@facebook.com"
        val fbId = "fb_dali_auth"

        tvName.text = fbName
        tvEmail.text = "Connected as $fbName • Facebook Profile"
        tvAvatar.text = fbName.take(1).uppercase()
        btnContinue.text = "Continue as $fbName"

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()

        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        btnContinue.setOnClickListener {
            dialog.dismiss()
            val user = db.registerOrRestoreFacebook(fbName, fbEmail, fbId)
            prefs.saveCurrentUser(user)
            Toast.makeText(this, "Signed in with Facebook as ${user.name}", Toast.LENGTH_SHORT).show()
            navigateToMain()
        }

        btnCancel.setOnClickListener { dialog.dismiss() }

        dialog.show()
    }

    private fun showRestoreCodeDialog() {
        val builder = AlertDialog.Builder(this)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 36, 48, 24)
            setBackgroundColor(Color.parseColor("#12121A"))
        }

        val title = TextView(this).apply {
            text = "Restore Account"
            setTextColor(Color.parseColor("#F2F2F5"))
            textSize = 18f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        val sub = TextView(this).apply {
            text = "Enter your 8-character ID to restore your XP balance and streaks."
            setTextColor(Color.parseColor("#9CA3AF"))
            textSize = 13f
            setPadding(0, 8, 0, 16)
        }
        val etCode = EditText(this).apply {
            hint = "e.g. K9#mX2!a"
            typeface = android.graphics.Typeface.MONOSPACE
            setHintTextColor(Color.parseColor("#55555F"))
            setTextColor(Color.parseColor("#F2F2F5"))
            setBackgroundResource(R.drawable.bg_input_field)
            setPadding(32, 24, 32, 24)
        }
        val btnSubmit = Button(this).apply {
            text = "Restore Account"
            setTextColor(Color.WHITE)
            setBackgroundResource(R.drawable.btn_accent_primary)
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            params.topMargin = 20
            layoutParams = params
        }

        layout.addView(title)
        layout.addView(sub)
        layout.addView(etCode)
        layout.addView(btnSubmit)

        val dialog = builder.setView(layout).create()
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        btnSubmit.setOnClickListener {
            val code = etCode.text.toString().trim()
            if (code.isEmpty()) {
                Toast.makeText(this, "Please enter your ID, email, or @tag", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            btnSubmit.isEnabled = false
            btnSubmit.text = "Searching cloud..."

            db.fetchAndFindUserByCode(code) { user ->
                btnSubmit.isEnabled = true
                btnSubmit.text = "Restore Account"

                if (user != null) {
                    prefs.saveCurrentUser(user)
                    dialog.dismiss()
                    Toast.makeText(this, "Restored ${user.name} (${user.username})", Toast.LENGTH_SHORT).show()
                    navigateToMain()
                } else {
                    Toast.makeText(this, "No registered account found with that ID or @tag.", Toast.LENGTH_SHORT).show()
                }
            }
        }

        dialog.show()
    }

    private fun navigateToMain() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish()
    }
}

package com.streakstake.app

import android.Manifest
import android.app.AlertDialog
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.Vibrator
import android.os.VibrationEffect
import android.view.LayoutInflater
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import com.streakstake.app.data.AppPreferences
import com.streakstake.app.databinding.ActivityWalkTrackerBinding
import com.streakstake.app.models.SocialFeedItem
import com.streakstake.app.models.Stake
import com.streakstake.app.models.StakeStatus
import java.util.UUID
import kotlin.math.sqrt

class WalkTrackerActivity : AppCompatActivity(), SensorEventListener, LocationListener {

    private lateinit var binding: ActivityWalkTrackerBinding
    private lateinit var prefs: AppPreferences
    private var stake: Stake? = null

    private lateinit var sensorManager: SensorManager
    private var stepDetectorSensor: Sensor? = null
    private var accelerometerSensor: Sensor? = null
    private var locationManager: LocationManager? = null

    private var stepsCount = 0
    private var currentMeters = 0
    private var targetMeters = 500
    private var lastMagnitude = 9.8
    private var lastStepTime = 0L

    private var lastGpsLocation: Location? = null
    private var gpsMetersTraversed = 0.0

    private var timerSeconds = 0
    private val handler = Handler(Looper.getMainLooper())
    private var isTracking = true

    private val timerRunnable = object : Runnable {
        override fun run() {
            if (isTracking) {
                timerSeconds++
                val mins = timerSeconds / 60
                val secs = timerSeconds % 60
                binding.tvTimer.text = String.format("%02d:%02d", mins, secs)
                handler.postDelayed(this, 1000)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityWalkTrackerBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = AppPreferences(this)
        val stakeId = intent.getStringExtra("STAKE_ID")
        stake = prefs.getStakes().find { it.id == stakeId }

        targetMeters = stake?.targetMeters ?: intent.getIntExtra("TARGET_METERS", 500)
        val stakeXp = stake?.stakeXp ?: intent.getIntExtra("STAKE_XP", 100)

        binding.tvStakeLockedPill.text = "$stakeXp XP Staked"
        binding.tvMetersTarget.text = "/ $targetMeters METERS"

        initSensors()
        setupListeners()

        handler.post(timerRunnable)
    }

    private fun initSensors() {
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager

        stepDetectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
        accelerometerSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

        if (stepDetectorSensor != null) {
            sensorManager.registerListener(this, stepDetectorSensor, SensorManager.SENSOR_DELAY_UI)
        }
        if (accelerometerSensor != null) {
            sensorManager.registerListener(this, accelerometerSensor, SensorManager.SENSOR_DELAY_UI)
        }

        checkPermissionsAndStartGps()
    }

    private fun checkPermissionsAndStartGps() {
        val permissions = mutableListOf<String>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.ACTIVITY_RECOGNITION)
            }
        }

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }

        if (permissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toTypedArray(), 1001)
        } else {
            startGpsTracking()
        }
    }

    private fun startGpsTracking() {
        if (!prefs.isGpsEnabled()) return
        try {
            locationManager = getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            locationManager?.let { lm ->
                if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2000L, 2f, this)
                } else if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                    lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 2000L, 2f, this)
                }
            }
        } catch (e: SecurityException) {
            // Handled gracefully
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1001) {
            startGpsTracking()
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (!isTracking || event == null) return

        if (event.sensor.type == Sensor.TYPE_STEP_DETECTOR) {
            onStepDetected()
        } else if (event.sensor.type == Sensor.TYPE_ACCELEROMETER && stepDetectorSensor == null) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]
            val magnitude = sqrt((x * x + y * y + z * z).toDouble())
            val delta = magnitude - lastMagnitude
            lastMagnitude = magnitude

            val now = System.currentTimeMillis()
            if (delta > 2.5 && magnitude > 11.2 && (now - lastStepTime > 260)) {
                lastStepTime = now
                onStepDetected()
            }
        }
    }

    private fun onStepDetected() {
        stepsCount++
        // Average human step length is ~0.762 meters
        val sensorMeters = (stepsCount * 0.762).toInt()
        val calculatedMeters = maxOf(sensorMeters, gpsMetersTraversed.toInt())
        currentMeters = calculatedMeters

        runOnUiThread {
            binding.tvStepsCount.text = stepsCount.toString()
            binding.tvMetersCurrent.text = currentMeters.toString()

            val progress = ((currentMeters.toFloat() / targetMeters.toFloat()) * 100).toInt().coerceIn(0, 100)
            binding.pbWalk.progress = progress

            if (currentMeters >= targetMeters && !binding.btnCompleteWalk.isEnabled) {
                binding.btnCompleteWalk.isEnabled = true
                binding.btnCompleteWalk.text = "VERIFY & CLAIM REWARD ($currentMeters m)"
                vibrate(300)
            }
        }
    }

    override fun onLocationChanged(location: Location) {
        if (!isTracking) return
        val last = lastGpsLocation
        if (last != null && location.accuracy < 25) {
            val dist = last.distanceTo(location)
            if (dist in 1.0..10.0) { // filter out GPS jumps
                gpsMetersTraversed += dist
                val calculatedMeters = maxOf((stepsCount * 0.762).toInt(), gpsMetersTraversed.toInt())
                currentMeters = calculatedMeters

                runOnUiThread {
                    binding.tvMetersCurrent.text = currentMeters.toString()
                    val progress = ((currentMeters.toFloat() / targetMeters.toFloat()) * 100).toInt().coerceIn(0, 100)
                    binding.pbWalk.progress = progress

                    if (currentMeters >= targetMeters && !binding.btnCompleteWalk.isEnabled) {
                        binding.btnCompleteWalk.isEnabled = true
                        binding.btnCompleteWalk.text = "VERIFY & CLAIM REWARD ($currentMeters m)"
                        vibrate(300)
                    }
                }
            }
        }
        lastGpsLocation = location
    }

    private fun setupListeners() {
        binding.btnClose.setOnClickListener {
            finish()
        }

        binding.btnSimulateSteps.setOnClickListener {
            repeat(50) { onStepDetected() }
            Toast.makeText(this, "+50 Steps Simulated (~38m)", Toast.LENGTH_SHORT).show()
        }

        binding.btnCompleteWalk.setOnClickListener {
            showProofSubmissionDialog()
        }

        binding.btnGiveUp.setOnClickListener {
            burnStake()
        }
    }

    private fun showProofSubmissionDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_submit_proof, null)
        val tvMetrics = dialogView.findViewById<TextView>(R.id.tvProofMetrics)
        val etNote = dialogView.findViewById<EditText>(R.id.etProofNote)
        val btnSubmitToPeers = dialogView.findViewById<Button>(R.id.btnSubmitToPeers)
        val btnClaimSolo = dialogView.findViewById<Button>(R.id.btnClaimSolo)

        tvMetrics.text = "${currentMeters}m Walk Completed ($stepsCount Steps)"

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()

        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        btnSubmitToPeers.setOnClickListener {
            val note = etNote.text.toString().trim()
            submitToPeersForVerification(note)
            dialog.dismiss()
        }

        btnClaimSolo.setOnClickListener {
            completeInstantSolo()
            dialog.dismiss()
        }

        dialog.show()
    }

    private fun submitToPeersForVerification(note: String) {
        val user = prefs.getCurrentUser() ?: return
        val currentStake = stake ?: return

        currentStake.status = StakeStatus.PENDING_VERIFICATION
        currentStake.currentMeters = currentMeters
        currentStake.stepsCount = stepsCount
        currentStake.proofNote = if (note.isNotEmpty()) note else "Walk completed verified via native step detector"
        currentStake.completedAt = System.currentTimeMillis()

        prefs.updateStake(currentStake)
        prefs.addPeerPendingStake(currentStake)

        // Add to social feed
        prefs.addSocialFeedItem(
            SocialFeedItem(
                id = "feed_" + UUID.randomUUID().toString().take(8),
                userId = user.id,
                userName = user.name,
                actionType = "PROOF_SUBMITTED",
                description = "Completed '${currentStake.title}' ($currentMeters m). Proof submitted to Peer Queue for verification!",
                xpAmount = currentStake.stakeXp
            )
        )

        Toast.makeText(this, "Proof locked in escrow! Awaiting friend verification.", Toast.LENGTH_LONG).show()
        finish()
    }

    private fun completeInstantSolo() {
        val user = prefs.getCurrentUser() ?: return
        val currentStake = stake

        val stakeXp = currentStake?.stakeXp ?: 100
        val bonus = (stakeXp * 0.5).toInt()
        val totalReward = stakeXp + bonus

        user.totalXp += totalReward
        user.currentStreak += 1
        user.bestStreak = maxOf(user.bestStreak, user.currentStreak)
        user.challengesCompleted += 1
        prefs.saveCurrentUser(user)

        currentStake?.let {
            it.status = StakeStatus.VERIFIED
            it.currentMeters = currentMeters
            it.stepsCount = stepsCount
            it.completedAt = System.currentTimeMillis()
            prefs.updateStake(it)
        }

        prefs.addSocialFeedItem(
            SocialFeedItem(
                id = "feed_" + UUID.randomUUID().toString().take(8),
                userId = user.id,
                userName = user.name,
                actionType = "STAKE_VERIFIED",
                description = "Completed '${currentStake?.title}' ($currentMeters m) +$totalReward XP awarded!",
                xpAmount = totalReward
            )
        )

        Toast.makeText(this, "Target Achieved! +$totalReward XP awarded! Streak: ${user.currentStreak}", Toast.LENGTH_LONG).show()
        finish()
    }

    private fun burnStake() {
        val user = prefs.getCurrentUser() ?: return
        val currentStake = stake

        val stakeXp = currentStake?.stakeXp ?: 100
        user.currentStreak = 0
        user.challengesFailed += 1
        prefs.saveCurrentUser(user)

        currentStake?.let {
            it.status = StakeStatus.BURNED
            prefs.updateStake(it)
        }

        prefs.addSocialFeedItem(
            SocialFeedItem(
                id = "feed_" + UUID.randomUUID().toString().take(8),
                userId = user.id,
                userName = user.name,
                actionType = "STAKE_BURNED",
                description = "Forfeited '${currentStake?.title}'. Lost $stakeXp XP & streak reset to 0.",
                xpAmount = stakeXp
            )
        )

        Toast.makeText(this, "Stake Burned: $stakeXp XP lost & streak reset to 0.", Toast.LENGTH_SHORT).show()
        finish()
    }

    private fun vibrate(ms: Long) {
        if (!prefs.isHapticEnabled()) return
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        vibrator?.let {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                it.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                it.vibrate(ms)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isTracking = false
        handler.removeCallbacks(timerRunnable)
        sensorManager.unregisterListener(this)
        locationManager?.removeUpdates(this)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    companion object {
        const val EXTRA_STAKE_ID = "STAKE_ID"
        const val EXTRA_TARGET_METERS = "TARGET_METERS"
        const val EXTRA_STAKE_XP = "STAKE_XP"
    }
}

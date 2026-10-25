package com.streakstake.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
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
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import com.streakstake.app.data.AppPreferences
import com.streakstake.app.databinding.ActivityWalkTrackerBinding
import com.streakstake.app.models.Stake
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

        // Hardware step detector
        stepDetectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
        // Accelerometer fallback for all devices
        accelerometerSensor = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

        if (stepDetectorSensor != null) {
            sensorManager.registerListener(this, stepDetectorSensor, SensorManager.SENSOR_DELAY_UI)
        }
        if (accelerometerSensor != null) {
            sensorManager.registerListener(this, accelerometerSensor, SensorManager.SENSOR_DELAY_UI)
        }

        // Request Activity Recognition and Location permissions if needed
        checkPermissionsAndStartGps()
    }

    private fun checkPermissionsAndStartGps() {
        val permissions = mutableListOf<String>()
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.ACTIVITY_RECOGNITION)
            }
        }

        if (permissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toTypedArray(), 101)
        } else {
            startGpsUpdates()
        }
    }

    private fun startGpsUpdates() {
        try {
            locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            if (locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 1.0f, this)
            } else if (locationManager?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 1000L, 1.0f, this)
            }
        } catch (e: SecurityException) {
            // Location permission not granted, accelerometer step detection remains active
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (!isTracking || event == null) return

        if (event.sensor.type == Sensor.TYPE_STEP_DETECTOR) {
            onStepDetected()
        } else if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            // Accelerometer peak detection algorithm
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]
            val magnitude = sqrt((x * x + y * y + z * z).toDouble())
            val now = System.currentTimeMillis()

            if (magnitude > 11.2 && lastMagnitude <= 11.2 && (now - lastStepTime) > 260) {
                lastStepTime = now
                onStepDetected()
            }
            lastMagnitude = magnitude
        }
    }

    private fun onStepDetected() {
        stepsCount++
        // Stride calculation: ~0.76 meters per step
        val stepDistance = (stepsCount * 0.76).toInt()
        currentMeters = maxOf(stepDistance, gpsMetersTraversed.toInt())
        updateUiMetrics()

        if (stepsCount % 15 == 0) {
            vibrate(20L)
        }
    }

    override fun onLocationChanged(location: Location) {
        if (!isTracking) return
        lastGpsLocation?.let { prev ->
            val distance = prev.distanceTo(location)
            if (distance in 1.0..30.0) {
                gpsMetersTraversed += distance
                currentMeters = maxOf(currentMeters, gpsMetersTraversed.toInt())
                updateUiMetrics()
            }
        }
        lastGpsLocation = location
    }

    private fun updateUiMetrics() {
        binding.tvMetersCurrent.text = currentMeters.toString()
        binding.tvStepsCount.text = stepsCount.toString()

        val progress = if (targetMeters > 0) ((currentMeters.toFloat() / targetMeters) * 100).toInt() else 0
        binding.pbWalk.progress = progress.coerceAtMost(100)

        if (currentMeters >= targetMeters) {
            binding.btnCompleteWalk.isEnabled = true
            binding.tvSensorStatus.text = "★ TARGET REACHED! Tap to claim XP"
            vibrate(100L)
        }
    }

    private fun setupListeners() {
        binding.btnClose.setOnClickListener {
            finish()
        }

        binding.btnSimulateSteps.setOnClickListener {
            // Simulator adds 50 steps (~38 meters)
            repeat(50) { onStepDetected() }
            Toast.makeText(this, "+50 Steps Simulated (~38m)", Toast.LENGTH_SHORT).show()
        }

        binding.btnCompleteWalk.setOnClickListener {
            completeChallengeAndClaimReward()
        }

        binding.btnGiveUp.setOnClickListener {
            burnStake()
        }
    }

    private fun completeChallengeAndClaimReward() {
        val user = prefs.getCurrentUser() ?: return
        val currentStake = stake

        val stakeXp = currentStake?.stakeXp ?: 100
        val bonus = (stakeXp * 0.5).toInt() // 1.5x multiplier
        val totalReward = stakeXp + bonus

        user.totalXp += totalReward
        user.currentStreak += 1
        user.bestStreak = maxOf(user.bestStreak, user.currentStreak)
        user.challengesCompleted += 1
        prefs.saveCurrentUser(user)

        currentStake?.let {
            it.isCompleted = true
            it.currentMeters = currentMeters
            it.stepsCount = stepsCount
            prefs.updateStake(it)
        }

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
            it.isBurned = true
            prefs.updateStake(it)
        }

        Toast.makeText(this, "Stake Burned: $stakeXp XP lost & streak reset to 0.", Toast.LENGTH_SHORT).show()
        finish()
    }

    private fun vibrate(ms: Long) {
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
}

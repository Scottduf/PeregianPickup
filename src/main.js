import './style.css';

class SuperRecycleGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.gameState = 'playing'; // 'playing', 'gameOver'
    
    // Game settings
    this.gameTime = 60;
    this.timeLeft = this.gameTime;
    this.score = 0;
    this.gameSpeed = 1;
    
    // Player
    this.player = {
      x: 400,
      y: 300,
      width: 40,
      height: 40,
      speed: 4,
      vx: 0,
      vy: 0,
      carrying: null,
      color: '#4A90E2',
      direction: 'down', // for animation
      animFrame: 0,
      animSpeed: 0.2,
      immune: true, // Start with immunity
      immuneTimer: 180 // 3 seconds of immunity at start (60fps * 3)
    };
    
    // Touch controls
    this.touches = {};
    this.setupTouchControls();
    
    // Game objects
    this.trash = [];
    this.bins = [];
    this.enemies = [];
    this.particles = [];
    this.obstacles = []; // Add obstacles array
    this.soundEffects = {};
    
    // Initialize sound effects
    this.initializeSounds();
    
    // Initialize game objects
    this.initializeBins();
    this.initializeObstacles(); // Add obstacle initialization
    this.spawnTrash();
    this.spawnEnemies();
    
    // Load leaderboard
    this.loadLeaderboard();
    
    // Start game loop
    this.gameLoop();
    this.startTimer();
  }
  
  initializeSounds() {
    // Create audio context for sound effects
    this.audioContext = null;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('Audio not supported');
    }
  }
  
  // Generate sound effect using Web Audio API
  playSound(frequency, duration, type = 'sine', volume = 0.1) {
    if (!this.audioContext) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      console.log('Sound playback failed');
    }
  }
  
  playBinSound(correct = true) {
    if (correct) {
      // Success sound - ascending notes
      this.playSound(523, 0.1, 'sine', 0.15); // C5
      setTimeout(() => this.playSound(659, 0.1, 'sine', 0.15), 50); // E5
      setTimeout(() => this.playSound(784, 0.15, 'sine', 0.15), 100); // G5
    } else {
      // Incorrect sound - lower tone
      this.playSound(392, 0.2, 'square', 0.1); // G4
    }
  }
  
  playTurkeySound() {
    // Turkey "gobble" sound - rapid frequency changes
    this.playSound(200, 0.05, 'sawtooth', 0.2);
    setTimeout(() => this.playSound(180, 0.05, 'sawtooth', 0.15), 60);
    setTimeout(() => this.playSound(220, 0.05, 'sawtooth', 0.15), 120);
    setTimeout(() => this.playSound(160, 0.1, 'sawtooth', 0.1), 180);
  }
  
  setupTouchControls() {
    // Touch controls for mobile/iPad
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      
      // Move player towards touch position
      this.movePlayerTowards(touchX, touchY);
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;
      
      this.movePlayerTowards(touchX, touchY);
    });
    
    // Mouse controls for desktop
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      this.movePlayerTowards(clickX, clickY);
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      this.handleKeyboard(e.key);
    });
  }
  
  movePlayerTowards(targetX, targetY) {
    const dx = targetX - (this.player.x + this.player.width / 2);
    const dy = targetY - (this.player.y + this.player.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      this.player.vx = (dx / distance) * this.player.speed;
      this.player.vy = (dy / distance) * this.player.speed;
    } else {
      this.player.vx = 0;
      this.player.vy = 0;
    }
  }
  
  handleKeyboard(key) {
    const speed = this.player.speed;
    switch(key) {
      case 'ArrowUp':
      case 'w':
        this.player.vy = -speed;
        break;
      case 'ArrowDown':
      case 's':
        this.player.vy = speed;
        break;
      case 'ArrowLeft':
      case 'a':
        this.player.vx = -speed;
        break;
      case 'ArrowRight':
      case 'd':
        this.player.vx = speed;
        break;
    }
  }
  
  initializeBins() {
    this.bins = [
      { x: 50, y: 50, width: 60, height: 80, type: 'recycle', color: '#4A90E2', label: 'Recycle' },
      { x: 50, y: 200, width: 60, height: 80, type: 'compost', color: '#7ED321', label: 'Compost' },
      { x: 50, y: 350, width: 60, height: 80, type: 'trash', color: '#2D5016', label: 'Trash' }
    ];
  }

  initializeObstacles() {
    this.obstacles = [
      // Fewer, more strategically placed obstacles
      { x: 300, y: 150, width: 80, height: 100, type: 'slide', color: '#FF6B6B' },
      { x: 500, y: 300, width: 60, height: 60, type: 'roundabout', color: '#4ECDC4' },
      
      // Just two trees for natural barriers
      { x: 200, y: 250, width: 50, height: 80, type: 'tree', color: '#228B22' },
      { x: 600, y: 150, width: 55, height: 85, type: 'tree', color: '#32CD32' },
      
      // One bench
      { x: 450, y: 100, width: 80, height: 30, type: 'bench', color: '#8B4513' }
    ];
  }
  
  spawnTrash() {
    const trashTypes = [
      { 
        type: 'recycle', 
        color: '#4A90E2', 
        items: [
          { name: 'bottle', shape: 'bottle', color: '#87CEEB', detail: '#4169E1' },
          { name: 'can', shape: 'can', color: '#C0C0C0', detail: '#FF6347' },
          { name: 'paper', shape: 'paper', color: '#F5F5DC', detail: '#000080' }
        ]
      },
      { 
        type: 'compost', 
        color: '#7ED321', 
        items: [
          { name: 'banana', shape: 'banana', color: '#FFD700', detail: '#8B4513' },
          { name: 'apple', shape: 'apple', color: '#FF6347', detail: '#228B22' },
          { name: 'leaves', shape: 'leaves', color: '#228B22', detail: '#8B4513' }
        ]
      },
      { 
        type: 'trash', 
        color: '#2D5016', 
        items: [
          { name: 'wrapper', shape: 'wrapper', color: '#FF69B4', detail: '#8A2BE2' },
          { name: 'gum', shape: 'gum', color: '#FF1493', detail: '#B22222' },
          { name: 'chip_bag', shape: 'bag', color: '#FFD700', detail: '#FF4500' }
        ]
      }
    ];
    
    for (let i = 0; i < 18; i++) {
      const typeData = trashTypes[Math.floor(Math.random() * trashTypes.length)];
      const itemData = typeData.items[Math.floor(Math.random() * typeData.items.length)];
      
      // Try to find a valid spawn position (not inside obstacles or bins)
      let attempts = 0;
      let validPosition = false;
      let newTrash;
      
      while (!validPosition && attempts < 30) {
        newTrash = {
          x: Math.random() * (this.canvas.width - 200) + 150,
          y: Math.random() * (this.canvas.height - 100) + 50,
          width: 24,
          height: 24,
          type: typeData.type,
          item: itemData.name,
          shape: itemData.shape,
          color: itemData.color,
          detailColor: itemData.detail,
          rotation: Math.random() * 0.4 - 0.2
        };
        
        // Check if position conflicts with obstacles or bins
        validPosition = true;
        for (let obstacle of [...this.obstacles, ...this.bins]) {
          if (this.isColliding(newTrash, obstacle)) {
            validPosition = false;
            break;
          }
        }
        attempts++;
      }
      
      // Only add if we found a valid position (should almost always succeed with 30 attempts)
      if (validPosition) {
        this.trash.push(newTrash);
      }
    }
  }
  
  spawnEnemies() {
    // Bush turkeys as enemies - more aggressive
    for (let i = 0; i < 4; i++) {
      this.enemies.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        width: 40,
        height: 40,
        speed: 2.0, // Increased base speed
        chaseSpeed: 3.5, // Much faster when chasing
        color: '#8B4513',
        chasing: false,
        alertDistance: 150, // Larger detection range
        aggressionLevel: 0,
        lastPlayerDistance: 999,
        animFrame: Math.random() * 4
      });
    }
  }
  
  updatePlayer() {
    // Update immunity timer
    if (this.player.immune) {
      this.player.immuneTimer--;
      if (this.player.immuneTimer <= 0) {
        this.player.immune = false;
      }
    }
    
    if (this.player.vx || this.player.vy) {
      // Store old position
      const oldX = this.player.x;
      const oldY = this.player.y;
      
      this.player.x += this.player.vx;
      this.player.y += this.player.vy;
      
      // Check collision with obstacles
      let collided = false;
      for (let obstacle of this.obstacles) {
        if (this.isColliding(this.player, obstacle)) {
          // Revert movement
          this.player.x = oldX;
          this.player.y = oldY;
          // Stop movement
          this.player.vx = 0;
          this.player.vy = 0;
          collided = true;
          break;
        }
      }
      
      // Also check collision with bins (can't walk through them)
      if (!collided) {
        for (let bin of this.bins) {
          if (this.isColliding(this.player, bin)) {
            // Allow small overlap for deposits but prevent walking through
            const overlapX = Math.min(this.player.x + this.player.width - bin.x, bin.x + bin.width - this.player.x);
            const overlapY = Math.min(this.player.y + this.player.height - bin.y, bin.y + bin.height - this.player.y);
            
            // If significant overlap, treat as solid collision
            if (overlapX > 10 && overlapY > 10) {
              this.player.x = oldX;
              this.player.y = oldY;
              this.player.vx = 0;
              this.player.vy = 0;
              collided = true;
              break;
            }
          }
        }
      }
      
      if (!collided) {
        // Gradually slow down
        this.player.vx *= 0.9;
        this.player.vy *= 0.9;
        
        // Stop if very slow
        if (Math.abs(this.player.vx) < 0.1) this.player.vx = 0;
        if (Math.abs(this.player.vy) < 0.1) this.player.vy = 0;
      }
    }
    
    // Keep player on screen
    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.width, this.player.x));
    this.player.y = Math.max(0, Math.min(this.canvas.height - this.player.height, this.player.y));
  }
  
  updateEnemies() {
    this.enemies.forEach(enemy => {
      // Initialize AI state if not exists
      if (!enemy.wanderAngle) enemy.wanderAngle = Math.random() * Math.PI * 2;
      if (!enemy.wanderTimer) enemy.wanderTimer = 0;
      if (!enemy.alertDistance) enemy.alertDistance = 150;
      if (!enemy.aggressionLevel) enemy.aggressionLevel = 0;
      if (!enemy.satisfiedTimer) enemy.satisfiedTimer = 0;
      
      // Handle satisfied timer (turkey is less aggressive after successful attack)
      if (enemy.satisfiedTimer > 0) {
        enemy.satisfiedTimer--;
        enemy.aggressionLevel = Math.max(enemy.aggressionLevel - 0.05, 0);
      }
      
      const playerDistance = Math.sqrt(
        Math.pow(this.player.x - enemy.x, 2) + 
        Math.pow(this.player.y - enemy.y, 2)
      );
      
      // Increase aggression when player has trash (but less aggressively)
      if (this.player.carrying && !this.player.immune && enemy.satisfiedTimer <= 0) {
        enemy.aggressionLevel = Math.min(enemy.aggressionLevel + 0.01, 0.6); // Reduced max aggression
      } else {
        enemy.aggressionLevel = Math.max(enemy.aggressionLevel - 0.02, 0);
      }
      
      // Less aggressive turkey behavior - only chase if player has been carrying for a while
      if (this.player.carrying && !this.player.immune && playerDistance < enemy.alertDistance && enemy.aggressionLevel > 0.3 && enemy.satisfiedTimer <= 0) {
        // AGGRESSIVE CHASE MODE
        enemy.chasing = true;
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          // Reduced chase speed to make game more playable
          const chaseSpeed = enemy.chaseSpeed * (0.7 + enemy.aggressionLevel * 0.3); // Much slower
          
          // Predictive chasing - aim where player is going
          const predictX = this.player.x + (this.player.vx || 0) * 10;
          const predictY = this.player.y + (this.player.vy || 0) * 10;
          
          const predDx = predictX - enemy.x;
          const predDy = predictY - enemy.y;
          const predDistance = Math.sqrt(predDx * predDx + predDy * predDy);
          
          if (predDistance > 0) {
            enemy.x += (predDx / predDistance) * chaseSpeed;
            enemy.y += (predDy / predDistance) * chaseSpeed;
          }
          
          // Add some randomness to make movement less predictable
          enemy.x += (Math.random() - 0.5) * 1;
          enemy.y += (Math.random() - 0.5) * 1;
        }
        
        // Play aggressive turkey sounds occasionally
        if (Math.random() < 0.005) {
          this.playTurkeySound();
        }
        
      } else if (!this.player.carrying && enemy.chasing && playerDistance < 80) {
        // FLEE MODE: Just lost chase, run away briefly
        enemy.chasing = false;
        enemy.fleeing = true;
        enemy.fleeTimer = 90; // flee longer
        
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          enemy.x += (dx / distance) * enemy.speed * 2.5;
          enemy.y += (dy / distance) * enemy.speed * 2.5;
        }
      } else if (enemy.fleeing && enemy.fleeTimer > 0) {
        // Continue fleeing
        enemy.fleeTimer--;
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          enemy.x += (dx / distance) * enemy.speed * 1.5;
          enemy.y += (dy / distance) * enemy.speed * 1.5;
        }
        
        if (enemy.fleeTimer <= 0) {
          enemy.fleeing = false;
        }
      } else {
        // PATROL MODE: More active wandering
        enemy.chasing = false;
        enemy.fleeing = false;
        
        // Change direction more frequently
        enemy.wanderTimer++;
        if (enemy.wanderTimer > 40 + Math.random() * 80) {
          enemy.wanderAngle = Math.random() * Math.PI * 2;
          enemy.wanderTimer = 0;
        }
        
        // Move in current direction with more speed
        const moveSpeed = enemy.speed * 0.8; // Faster patrol
        enemy.x += Math.cos(enemy.wanderAngle) * moveSpeed;
        enemy.y += Math.sin(enemy.wanderAngle) * moveSpeed;
        
        // Avoid edges by turning away
        const margin = 50;
        if (enemy.x < margin) enemy.wanderAngle = Math.random() * Math.PI - Math.PI/2;
        if (enemy.x > this.canvas.width - margin) enemy.wanderAngle = Math.random() * Math.PI + Math.PI/2;
        if (enemy.y < margin) enemy.wanderAngle = Math.random() * Math.PI;
        if (enemy.y > this.canvas.height - margin) enemy.wanderAngle = Math.random() * Math.PI + Math.PI;
      }
      
      // Check collision with obstacles and bins - avoid all solid objects
      for (let obstacle of [...this.obstacles, ...this.bins]) {
        if (this.isColliding(enemy, obstacle)) {
          // Smart bounce behavior - turn away from obstacle
          const dx = enemy.x + enemy.width/2 - (obstacle.x + obstacle.width/2);
          const dy = enemy.y + enemy.height/2 - (obstacle.y + obstacle.height/2);
          
          // Calculate angle away from obstacle
          enemy.wanderAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * Math.PI/3;
          
          // Move away from obstacle
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 0) {
            enemy.x += (dx / distance) * 15;
            enemy.y += (dy / distance) * 15;
          }
          break;
        }
      }
      
      // Keep enemies on screen (hard boundaries)
      enemy.x = Math.max(0, Math.min(this.canvas.width - enemy.width, enemy.x));
      enemy.y = Math.max(0, Math.min(this.canvas.height - enemy.height, enemy.y));
      
      // Store distance for next frame
      enemy.lastPlayerDistance = playerDistance;
    });
  }
  
  checkCollisions() {
    // Check trash pickup
    if (!this.player.carrying) {
      this.trash.forEach((item, index) => {
        if (this.isColliding(this.player, item)) {
          this.player.carrying = item;
          this.trash.splice(index, 1);
          this.updateUI();
          
          // Pickup sound effect
          this.playSound(440, 0.1, 'sine', 0.1);
        }
      });
    }
    
    // Check bin deposits
    if (this.player.carrying) {
      this.bins.forEach(bin => {
        if (this.isColliding(this.player, bin)) {
          const isCorrect = this.player.carrying.type === bin.type;
          
          if (isCorrect) {
            this.score += 10; // Correct bin
            this.createSuccessEffect(bin.x + bin.width/2, bin.y + bin.height/2);
            this.playBinSound(true);
          } else {
            this.score += 1; // Wrong bin, but still some points
            this.createFailEffect(bin.x + bin.width/2, bin.y + bin.height/2);
            this.playBinSound(false);
          }
          
          this.player.carrying = null;
          this.updateUI();
          
          // Spawn new trash occasionally
          if (Math.random() < 0.4) {
            this.spawnNewTrash();
          }
        }
      });
    }
    
    // Check enemy collisions (only if player is not immune and carrying something)
    if (this.player.carrying && !this.player.immune) {
      this.enemies.forEach(enemy => {
        if (this.isColliding(this.player, enemy)) {
          // Player loses carried item
          this.createPeckEffect(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
          this.playTurkeySound();
          
          // Turkey takes the item (remove it from game temporarily)
          this.player.carrying = null;
          this.updateUI();
          
          // Give player brief immunity after being attacked
          this.player.immune = true;
          this.player.immuneTimer = 90; // 1.5 seconds immunity
          
          // Push enemy away after successful attack
          const dx = enemy.x - this.player.x;
          const dy = enemy.y - this.player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 0) {
            enemy.x += (dx / distance) * 40;
            enemy.y += (dy / distance) * 40;
          }
          
          // Enemy becomes satisfied and less aggressive for a while
          enemy.aggressionLevel = 0;
          enemy.chasing = false;
          enemy.satisfiedTimer = 180; // 3 seconds of reduced activity
          
          // Camera shake effect
          this.cameraShake = 5; // Reduced shake
        }
      });
    }
  }
  
  // Particle effect methods
  createSuccessEffect(x, y) {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 2,
        life: 30,
        maxLife: 30,
        color: '#00FF00',
        size: Math.random() * 4 + 2,
        type: 'success'
      });
    }
    
    // Score popup
    this.particles.push({
      x: x,
      y: y - 20,
      vx: 0,
      vy: -2,
      life: 60,
      maxLife: 60,
      color: '#00FF00',
      size: 16,
      type: 'scoreText',
      text: '+10'
    });
  }
  
  createFailEffect(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 20,
        maxLife: 20,
        color: '#FF6600',
        size: Math.random() * 3 + 1,
        type: 'fail'
      });
    }
    
    // Score popup
    this.particles.push({
      x: x,
      y: y - 20,
      vx: 0,
      vy: -1,
      life: 40,
      maxLife: 40,
      color: '#FF6600',
      size: 14,
      type: 'scoreText',
      text: '+1'
    });
  }
  
  createPeckEffect(x, y) {
    // Feather/dust effect instead of blood
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 30,
        maxLife: 30,
        color: Math.random() > 0.5 ? '#D2691E' : '#8B4513', // Brown feather colors
        size: Math.random() * 4 + 2,
        type: 'feather'
      });
    }
    
    // Text effect
    this.particles.push({
      x: x,
      y: y - 15,
      vx: 0,
      vy: -2,
      life: 60,
      maxLife: 60,
      color: '#F5A623',
      size: 16,
      type: 'scoreText',
      text: 'PECKED!'
    });
  }

  createImpactEffect(x, y) {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 25,
        maxLife: 25,
        color: '#FF0000',
        size: Math.random() * 5 + 2,
        type: 'impact'
      });
    }
    
    // Impact text
    this.particles.push({
      x: x,
      y: y - 15,
      vx: 0,
      vy: -3,
      life: 45,
      maxLife: 45,
      color: '#FF0000',
      size: 18,
      type: 'scoreText',
      text: 'CAUGHT!'
    });
  }
  
  updateParticles() {
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life--;
      
      // Add gravity to some particles
      if (particle.type !== 'scoreText') {
        particle.vy += 0.2;
      }
      
      // Fade alpha
      particle.alpha = particle.life / particle.maxLife;
      
      return particle.life > 0;
    });
  }
  
  spawnNewTrash() {
    const trashTypes = [
      { type: 'recycle', color: '#2196F3', items: ['bottle', 'can', 'paper'] },
      { type: 'compost', color: '#FF9800', items: ['apple', 'banana', 'leaves'] },
      { type: 'trash', color: '#F44336', items: ['wrapper', 'gum', 'broken_toy'] }
    ];
    
    const typeData = trashTypes[Math.floor(Math.random() * trashTypes.length)];
    const item = typeData.items[Math.floor(Math.random() * typeData.items.length)];
    
    // Try to find a valid spawn position (not inside obstacles or bins)
    let attempts = 0;
    let validPosition = false;
    let newTrash;
    
    while (!validPosition && attempts < 20) {
      newTrash = {
        x: Math.random() * (this.canvas.width - 200) + 150,
        y: Math.random() * (this.canvas.height - 100) + 50,
        width: 20,
        height: 20,
        type: typeData.type,
        item: item,
        color: typeData.color
      };
      
      // Check if position conflicts with obstacles or bins
      validPosition = true;
      for (let obstacle of [...this.obstacles, ...this.bins]) {
        if (this.isColliding(newTrash, obstacle)) {
          validPosition = false;
          break;
        }
      }
      attempts++;
    }
    
    // Only add if we found a valid position
    if (validPosition) {
      this.trash.push(newTrash);
    }
  }
  
  // Enhanced realistic character drawing
  drawPlayer() {
    const ctx = this.ctx;
    const p = this.player;
    
    // Camera shake effect
    let shakeX = 0, shakeY = 0;
    if (this.cameraShake && this.cameraShake > 0) {
      shakeX = (Math.random() - 0.5) * this.cameraShake;
      shakeY = (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake--;
    }
    
    const drawX = p.x + shakeX;
    const drawY = p.y + shakeY;
    
    // Immunity effect - flashing/transparency
    if (p.immune) {
      const flickerRate = Math.floor(p.immuneTimer / 6) % 2;
      if (flickerRate === 0) {
        ctx.globalAlpha = 0.5; // Make player semi-transparent when immune
      }
    }
    
    // Update animation
    if (p.vx !== 0 || p.vy !== 0) {
      p.animFrame += p.animSpeed;
      if (p.animFrame >= 8) p.animFrame = 0;
      
      // Determine direction with more precision
      if (Math.abs(p.vx) > Math.abs(p.vy)) {
        p.direction = p.vx > 0 ? 'right' : 'left';
      } else if (p.vy !== 0) {
        p.direction = p.vy > 0 ? 'down' : 'up';
      }
    }
    
    // Draw shadow (larger and more realistic)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(drawX + p.width/2, drawY + p.height + 8, p.width/2 + 2, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Cape animation (more dynamic with school colors)
    ctx.fillStyle = '#F5A623'; // Gold cape like the logo
    const capeWave = Math.sin(p.animFrame * 0.5) * 3;
    const capeOffset = Math.sin(p.animFrame * 0.8) * 2;
    
    // Cape flowing effect
    ctx.beginPath();
    ctx.moveTo(drawX - 2 + capeOffset, drawY + 8);
    ctx.quadraticCurveTo(drawX - 8 + capeWave, drawY + 20, drawX - 1 + capeOffset, drawY + 32);
    ctx.quadraticCurveTo(drawX + 5 + capeWave, drawY + 35, drawX + 8 + capeOffset, drawY + 30);
    ctx.quadraticCurveTo(drawX + 6, drawY + 15, drawX + 3, drawY + 8);
    ctx.closePath();
    ctx.fill();
    
    // Main body (superhero suit with school colors)
    const bodyGradient = ctx.createLinearGradient(drawX, drawY, drawX + p.width, drawY + 25);
    bodyGradient.addColorStop(0, '#7ED321');
    bodyGradient.addColorStop(0.5, '#4A90E2');
    bodyGradient.addColorStop(1, '#2D5016');
    
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(drawX + 6, drawY + 14, 28, 22);
    
    // Chest muscles
    ctx.fillStyle = '#2D5016';
    ctx.fillRect(drawX + 10, drawY + 18, 8, 6);
    ctx.fillRect(drawX + 22, drawY + 18, 8, 6);
    
    // Belt (gold like logo)
    ctx.fillStyle = '#F5A623';
    ctx.fillRect(drawX + 8, drawY + 28, 24, 4);
    
    // Head (more detailed)
    ctx.fillStyle = '#FFDBAC'; // skin color
    ctx.beginPath();
    ctx.arc(drawX + p.width/2, drawY + 12, 14, 0, Math.PI * 2);
    ctx.fill();
    
    // Helmet with school colors
    const helmetGradient = ctx.createLinearGradient(drawX, drawY, drawX + p.width, drawY + 15);
    helmetGradient.addColorStop(0, '#4A90E2');
    helmetGradient.addColorStop(1, '#2D5016');
    ctx.fillStyle = helmetGradient;
    ctx.beginPath();
    ctx.arc(drawX + p.width/2, drawY + 9, 14, Math.PI, 0);
    ctx.fill();
    
    // Helmet shine
    ctx.fillStyle = '#7ED321';
    ctx.beginPath();
    ctx.arc(drawX + p.width/2 - 3, drawY + 6, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Recycling symbol on chest (school green)
    ctx.fillStyle = '#7ED321';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#2D5016';
    ctx.lineWidth = 1;
    ctx.strokeText('♻', drawX + p.width/2, drawY + 30);
    ctx.fillText('♻', drawX + p.width/2, drawY + 30);
    
    // Arms with school colors
    ctx.fillStyle = '#4A90E2';
    const armBob = Math.sin(p.animFrame) * 1;
    
    // Left arm
    ctx.fillRect(drawX + 2, drawY + 16 + armBob, 10, 14);
    // Left hand
    ctx.fillStyle = '#FFDBAC';
    ctx.beginPath();
    ctx.arc(drawX + 7, drawY + 32 + armBob, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Right arm
    ctx.fillStyle = '#4A90E2';
    ctx.fillRect(drawX + 28, drawY + 16 - armBob, 10, 14);
    // Right hand
    ctx.fillStyle = '#FFDBAC';
    ctx.beginPath();
    ctx.arc(drawX + 33, drawY + 32 - armBob, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs with walking animation
    const legOffset1 = Math.sin(p.animFrame * 1.5) * 3;
    const legOffset2 = Math.sin(p.animFrame * 1.5 + Math.PI) * 3;
    
    ctx.fillStyle = '#4A90E2';
    ctx.fillRect(drawX + 10, drawY + 36, 8, 12 + Math.abs(legOffset1));
    ctx.fillRect(drawX + 22, drawY + 36, 8, 12 + Math.abs(legOffset2));
    
    // Boots (dark green)
    ctx.fillStyle = '#2D5016';
    ctx.fillRect(drawX + 8, drawY + 46 + legOffset1, 12, 6);
    ctx.fillRect(drawX + 20, drawY + 46 + legOffset2, 12, 6);
    
    // Eyes with more expression
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(drawX + 16, drawY + 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(drawX + 24, drawY + 10, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(drawX + 16, drawY + 10, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(drawX + 24, drawY + 10, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyebrows
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(drawX + 13, drawY + 6);
    ctx.lineTo(drawX + 19, drawY + 7);
    ctx.moveTo(drawX + 21, drawY + 7);
    ctx.lineTo(drawX + 27, drawY + 6);
    ctx.stroke();
    
    // Draw carried item above head with enhanced 3D effect
    if (p.carrying) {
      this.drawRealisticTrash(p.carrying, drawX + 15, drawY - 20, 0.8);
    }
    
    // Reset alpha after immunity effect
    ctx.globalAlpha = 1.0;
  }
  
  // Realistic object rendering
  drawRealisticTrash(item, x, y, scale = 1) {
    const ctx = this.ctx;
    const width = item.width * scale;
    const height = item.height * scale;
    
    ctx.save();
    ctx.translate(x + width/2, y + height/2);
    ctx.rotate(item.rotation || 0);
    ctx.translate(-width/2, -height/2);
    
    // Shadow
    ctx.fillStyle = 'rgba(45, 80, 22, 0.3)';
    ctx.fillRect(4, 4, width, height);
    
    switch(item.shape) {
      case 'bottle':
        this.drawBottle(ctx, 0, 0, width, height, item.color, item.detailColor);
        break;
      case 'can':
        this.drawCan(ctx, 0, 0, width, height, item.color, item.detailColor);
        break;
      case 'paper':
        this.drawPaper(ctx, 0, 0, width, height, item.color, item.detailColor);
        break;
      case 'banana':
        this.drawBanana(ctx, 0, 0, width, height, item.color, item.detailColor);
        break;
      case 'apple':
        this.drawApple(ctx, 0, 0, width, height, item.color, item.detailColor);
        break;
      case 'leaves':
        this.drawLeaves(ctx, 0, 0, width, height, item.color, item.detailColor);
        break;
      case 'wrapper':
        this.drawWrapper(ctx, 0, 0, width, height, item.color, item.detailColor);
        break;
      case 'gum':
        this.drawGum(ctx, 0, 0, width, height, item.color, item.detailColor);
        break;
      case 'bag':
        this.drawChipBag(ctx, 0, 0, width, height, item.color, item.detailColor);
        break;
    }
    
    ctx.restore();
  }
  
  drawBottle(ctx, x, y, w, h, color, detailColor) {
    // Bottle body
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, this.lightenColor(color, 0.3));
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, this.darkenColor(color, 0.3));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x + w*0.2, y + h*0.3, w*0.6, h*0.6);
    
    // Bottle neck
    ctx.fillStyle = this.darkenColor(color, 0.2);
    ctx.fillRect(x + w*0.35, y, w*0.3, h*0.4);
    
    // Cap
    ctx.fillStyle = detailColor;
    ctx.fillRect(x + w*0.3, y, w*0.4, h*0.15);
    
    // Label
    ctx.fillStyle = 'white';
    ctx.fillRect(x + w*0.25, y + h*0.4, w*0.5, h*0.2);
    
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(x + w*0.25, y + h*0.35, w*0.15, h*0.3);
  }
  
  drawCan(ctx, x, y, w, h, color, detailColor) {
    // Can body
    const gradient = ctx.createRadialGradient(x + w/2, y + h/2, 0, x + w/2, y + h/2, w/2);
    gradient.addColorStop(0, this.lightenColor(color, 0.4));
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, this.darkenColor(color, 0.3));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y + h*0.1, w, h*0.8);
    
    // Top and bottom rims
    ctx.fillStyle = this.darkenColor(color, 0.4);
    ctx.fillRect(x, y, w, h*0.15);
    ctx.fillRect(x, y + h*0.85, w, h*0.15);
    
    // Pull tab
    ctx.fillStyle = detailColor;
    ctx.beginPath();
    ctx.arc(x + w*0.7, y + h*0.1, w*0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Brand stripe
    ctx.fillStyle = detailColor;
    ctx.fillRect(x, y + h*0.4, w, h*0.2);
    
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x + w*0.1, y + h*0.2, w*0.2, h*0.6);
  }
  
  drawPaper(ctx, x, y, w, h, color, detailColor) {
    // Paper sheet with fold
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w*0.8, y);
    ctx.lineTo(x + w, y + h*0.2);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    
    // Fold triangle
    ctx.fillStyle = this.darkenColor(color, 0.2);
    ctx.beginPath();
    ctx.moveTo(x + w*0.8, y);
    ctx.lineTo(x + w, y + h*0.2);
    ctx.lineTo(x + w*0.8, y + h*0.2);
    ctx.closePath();
    ctx.fill();
    
    // Text lines
    ctx.strokeStyle = detailColor;
    ctx.lineWidth = 1;
    for(let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + w*0.1, y + h*0.3 + i*h*0.15);
      ctx.lineTo(x + w*0.7, y + h*0.3 + i*h*0.15);
      ctx.stroke();
    }
  }
  
  drawBanana(ctx, x, y, w, h, color, detailColor) {
    // Banana curve
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + w*0.2, y + h*0.8);
    ctx.quadraticCurveTo(x + w*0.1, y + h*0.3, x + w*0.4, y + h*0.1);
    ctx.quadraticCurveTo(x + w*0.7, y, x + w*0.9, y + h*0.2);
    ctx.quadraticCurveTo(x + w*0.8, y + h*0.4, x + w*0.6, y + h*0.6);
    ctx.quadraticCurveTo(x + w*0.4, y + h*0.9, x + w*0.2, y + h*0.8);
    ctx.fill();
    
    // Brown spots
    ctx.fillStyle = detailColor;
    ctx.beginPath();
    ctx.arc(x + w*0.3, y + h*0.4, w*0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w*0.6, y + h*0.3, w*0.06, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight
    ctx.fillStyle = this.lightenColor(color, 0.3);
    ctx.fillRect(x + w*0.35, y + h*0.2, w*0.15, h*0.4);
  }
  
  drawApple(ctx, x, y, w, h, color, detailColor) {
    // Apple body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + w/2, y + h*0.6, w*0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Apple top indent
    ctx.fillStyle = this.darkenColor(color, 0.3);
    ctx.beginPath();
    ctx.arc(x + w/2, y + h*0.3, w*0.15, 0, Math.PI);
    ctx.fill();
    
    // Stem
    ctx.fillStyle = detailColor;
    ctx.fillRect(x + w*0.48, y + h*0.1, w*0.04, h*0.2);
    
    // Leaf
    ctx.fillStyle = detailColor;
    ctx.beginPath();
    ctx.ellipse(x + w*0.6, y + h*0.15, w*0.1, w*0.05, Math.PI/4, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight
    ctx.fillStyle = this.lightenColor(color, 0.4);
    ctx.beginPath();
    ctx.arc(x + w*0.35, y + h*0.45, w*0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  
  drawLeaves(ctx, x, y, w, h, color, detailColor) {
    // Multiple leaves
    for(let i = 0; i < 3; i++) {
      const leafX = x + i * w*0.2;
      const leafY = y + i * h*0.1;
      
      ctx.fillStyle = i === 0 ? color : this.darkenColor(color, 0.2 * i);
      ctx.beginPath();
      ctx.ellipse(leafX + w*0.3, leafY + h*0.3, w*0.25, h*0.4, i*0.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Leaf veins
      ctx.strokeStyle = detailColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leafX + w*0.3, leafY + h*0.1);
      ctx.lineTo(leafX + w*0.3, leafY + h*0.5);
      ctx.stroke();
    }
  }
  
  drawWrapper(ctx, x, y, w, h, color, detailColor) {
    // Crumpled wrapper
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + h*0.2);
    ctx.lineTo(x + w*0.3, y);
    ctx.lineTo(x + w*0.7, y + h*0.1);
    ctx.lineTo(x + w, y + h*0.3);
    ctx.lineTo(x + w*0.8, y + h*0.7);
    ctx.lineTo(x + w*0.9, y + h);
    ctx.lineTo(x + w*0.2, y + h*0.9);
    ctx.lineTo(x, y + h*0.6);
    ctx.closePath();
    ctx.fill();
    
    // Shiny parts
    ctx.fillStyle = this.lightenColor(color, 0.4);
    ctx.fillRect(x + w*0.2, y + h*0.2, w*0.2, h*0.15);
    ctx.fillRect(x + w*0.6, y + h*0.5, w*0.15, h*0.2);
    
    // Brand text
    ctx.fillStyle = detailColor;
    ctx.fillRect(x + w*0.3, y + h*0.4, w*0.4, h*0.1);
  }
  
  drawGum(ctx, x, y, w, h, color, detailColor) {
    // Gum blob
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + w*0.3, y + h*0.4, w*0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w*0.6, y + h*0.6, w*0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Sticky strands
    ctx.strokeStyle = this.lightenColor(color, 0.2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w*0.5, y + h*0.2);
    ctx.quadraticCurveTo(x + w*0.3, y + h*0.1, x + w*0.4, y);
    ctx.stroke();
  }
  
  drawChipBag(ctx, x, y, w, h, color, detailColor) {
    // Bag shape
    const gradient = ctx.createLinearGradient(x, y, x + w, y);
    gradient.addColorStop(0, this.lightenColor(color, 0.2));
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, this.darkenColor(color, 0.2));
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x + w*0.1, y);
    ctx.lineTo(x + w*0.9, y);
    ctx.lineTo(x + w*0.8, y + h);
    ctx.lineTo(x + w*0.2, y + h);
    ctx.closePath();
    ctx.fill();
    
    // Brand label
    ctx.fillStyle = detailColor;
    ctx.fillRect(x + w*0.2, y + h*0.3, w*0.6, h*0.4);
    
    // Crinkles
    ctx.strokeStyle = this.darkenColor(color, 0.3);
    ctx.lineWidth = 1;
    for(let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + w*0.1, y + h*0.2 + i*h*0.3);
      ctx.lineTo(x + w*0.9, y + h*0.25 + i*h*0.3);
      ctx.stroke();
    }
  }
  
  // 3D trash item rendering
  draw3DTrash(item, x, y, scale = 1) {
    const ctx = this.ctx;
    const width = item.width * scale;
    const height = item.height * scale;
    const depth = 8 * scale;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + depth/2, y + height + depth/2, width, height/2);
    
    // Create 3D effect with multiple faces
    
    // Top face
    ctx.fillStyle = this.lightenColor(item.color, 0.3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width + depth, y - depth);
    ctx.lineTo(x + depth, y - depth);
    ctx.closePath();
    ctx.fill();
    
    // Front face
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, item.color);
    gradient.addColorStop(1, this.darkenColor(item.color, 0.2));
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    
    // Right face
    ctx.fillStyle = this.darkenColor(item.color, 0.4);
    ctx.beginPath();
    ctx.moveTo(x + width, y);
    ctx.lineTo(x + width + depth, y - depth);
    ctx.lineTo(x + width + depth, y + height - depth);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();
    
    // Add highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(x + 2, y + 2, width/3, height/3);
    
    // Item-specific details
    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.floor(10 * scale)}px Arial`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeText(item.item, x + width/2, y + height/2 + 3);
    ctx.fillText(item.item, x + width/2, y + height/2 + 3);
    
    // Type indicator
    if (item.type === 'recycle') {
      ctx.fillStyle = '#00AA00';
      ctx.font = `${Math.floor(8 * scale)}px Arial`;
      ctx.fillText('♻', x + width - 6, y + 10);
    } else if (item.type === 'compost') {
      ctx.fillStyle = '#88AA00';
      ctx.font = `${Math.floor(8 * scale)}px Arial`;
      ctx.fillText('🍃', x + width - 6, y + 10);
    }
  }
  
  // Helper function to lighten colors
  lightenColor(color, factor) {
    const rgb = parseInt(color.slice(1), 16);
    const r = Math.min(255, Math.floor((rgb >> 16) + (255 - (rgb >> 16)) * factor));
    const g = Math.min(255, Math.floor(((rgb >> 8) & 255) + (255 - ((rgb >> 8) & 255)) * factor));
    const b = Math.min(255, Math.floor((rgb & 255) + (255 - (rgb & 255)) * factor));
    return `rgb(${r},${g},${b})`;
  }
  
  // Realistic bin drawing
  drawBin(bin) {
    const ctx = this.ctx;
    
    // Bin body (3D cylinder effect)
    const gradient = ctx.createLinearGradient(bin.x, 0, bin.x + bin.width, 0);
    gradient.addColorStop(0, bin.color);
    gradient.addColorStop(0.3, bin.color);
    gradient.addColorStop(0.7, this.darkenColor(bin.color, 0.3));
    gradient.addColorStop(1, this.darkenColor(bin.color, 0.5));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(bin.x, bin.y, bin.width, bin.height);
    
    // Bin lid
    ctx.fillStyle = this.darkenColor(bin.color, 0.2);
    ctx.fillRect(bin.x - 5, bin.y - 8, bin.width + 10, 10);
    
    // Lid handle
    ctx.fillStyle = '#666';
    ctx.fillRect(bin.x + bin.width/2 - 3, bin.y - 12, 6, 8);
    
    // Recycling symbols - much larger for better visibility
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial'; // Doubled size from 16px
    ctx.textAlign = 'center';
    
    if (bin.type === 'recycle') {
      ctx.fillText('♻', bin.x + bin.width/2, bin.y + bin.height/2 + 8);
    } else if (bin.type === 'compost') {
      ctx.fillText('🍎', bin.x + bin.width/2, bin.y + bin.height/2 + 8);
    } else {
      ctx.fillText('🗑', bin.x + bin.width/2, bin.y + bin.height/2 + 8);
    }
    
    // Label - also larger
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial'; // Increased from 12px
    ctx.fillText(bin.label, bin.x + bin.width/2, bin.y - 15);
  }

  // Draw 3D playground obstacles
  drawObstacle(obstacle) {
    const ctx = this.ctx;
    const depth = 15; // 3D depth effect
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(obstacle.x + depth/2, obstacle.y + obstacle.height + depth/2, obstacle.width, obstacle.height/3);
    
    switch(obstacle.type) {
      case 'slide':
        this.drawSlide(ctx, obstacle, depth);
        break;
      case 'roundabout':
        this.drawRoundabout(ctx, obstacle, depth);
        break;
      case 'seesaw':
        this.drawSeesaw(ctx, obstacle, depth);
        break;
      case 'swing':
        this.drawSwing(ctx, obstacle, depth);
        break;
      case 'tree':
        this.drawTree(ctx, obstacle, depth);
        break;
      case 'bench':
        this.drawBench(ctx, obstacle, depth);
        break;
    }
  }

  drawSlide(ctx, obstacle, depth) {
    // Slide structure with 3D effect
    // Base
    ctx.fillStyle = this.darkenColor(obstacle.color, 0.3);
    ctx.fillRect(obstacle.x + depth, obstacle.y + depth, obstacle.width, obstacle.height);
    
    // Top face
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    
    // Side face
    ctx.fillStyle = this.darkenColor(obstacle.color, 0.5);
    ctx.beginPath();
    ctx.moveTo(obstacle.x + obstacle.width, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.width + depth, obstacle.y + depth);
    ctx.lineTo(obstacle.x + obstacle.width + depth, obstacle.y + obstacle.height + depth);
    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
    ctx.closePath();
    ctx.fill();
    
    // Slide surface (diagonal)
    ctx.fillStyle = this.lightenColor(obstacle.color, 0.2);
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 10, obstacle.y + 10);
    ctx.lineTo(obstacle.x + obstacle.width - 10, obstacle.y + obstacle.height - 10);
    ctx.lineTo(obstacle.x + obstacle.width - 5, obstacle.y + obstacle.height - 10);
    ctx.lineTo(obstacle.x + 15, obstacle.y + 10);
    ctx.closePath();
    ctx.fill();
  }

  drawRoundabout(ctx, obstacle, depth) {
    // Circular playground equipment with 3D effect
    const centerX = obstacle.x + obstacle.width/2;
    const centerY = obstacle.y + obstacle.height/2;
    const radius = obstacle.width/2;
    
    // Base shadow
    ctx.fillStyle = this.darkenColor(obstacle.color, 0.5);
    ctx.beginPath();
    ctx.arc(centerX + depth/2, centerY + depth/2, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Main circle
    ctx.fillStyle = obstacle.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Center post
    ctx.fillStyle = this.darkenColor(obstacle.color, 0.3);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius/4, 0, Math.PI * 2);
    ctx.fill();
    
    // Handles
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const handleX = centerX + Math.cos(angle) * radius * 0.7;
      const handleY = centerY + Math.sin(angle) * radius * 0.7;
      ctx.beginPath();
      ctx.arc(handleX, handleY, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawSeesaw(ctx, obstacle, depth) {
    // Seesaw with 3D effect
    // Base support
    const centerX = obstacle.x + obstacle.width/2;
    const centerY = obstacle.y + obstacle.height/2;
    
    ctx.fillStyle = this.darkenColor(obstacle.color, 0.4);
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY);
    ctx.lineTo(centerX + 10, centerY);
    ctx.lineTo(centerX, obstacle.y + obstacle.height);
    ctx.closePath();
    ctx.fill();
    
    // Seesaw plank
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    
    // 3D effect
    ctx.fillStyle = this.darkenColor(obstacle.color, 0.3);
    ctx.fillRect(obstacle.x + depth, obstacle.y + depth, obstacle.width, obstacle.height/3);
    
    // Seats
    ctx.fillStyle = this.lightenColor(obstacle.color, 0.2);
    ctx.fillRect(obstacle.x + 5, obstacle.y - 5, 15, 10);
    ctx.fillRect(obstacle.x + obstacle.width - 20, obstacle.y - 5, 15, 10);
  }

  drawSwing(ctx, obstacle, depth) {
    // Swing set with 3D effect
    // Frame
    ctx.strokeStyle = obstacle.color;
    ctx.lineWidth = 6;
    
    // A-frame structure
    ctx.beginPath();
    ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
    ctx.lineTo(obstacle.x + obstacle.width/2, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
    ctx.stroke();
    
    // Top bar
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 5, obstacle.y + 10);
    ctx.lineTo(obstacle.x + obstacle.width - 5, obstacle.y + 10);
    ctx.stroke();
    
    // Swing chains
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    const swingX = obstacle.x + obstacle.width/2;
    ctx.beginPath();
    ctx.moveTo(swingX - 3, obstacle.y + 10);
    ctx.lineTo(swingX - 3, obstacle.y + obstacle.height - 10);
    ctx.moveTo(swingX + 3, obstacle.y + 10);
    ctx.lineTo(swingX + 3, obstacle.y + obstacle.height - 10);
    ctx.stroke();
    
    // Swing seat
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(swingX - 8, obstacle.y + obstacle.height - 15, 16, 6);
  }

  drawTree(ctx, obstacle, depth) {
    // Tree with 3D effect
    const centerX = obstacle.x + obstacle.width/2;
    const trunkWidth = obstacle.width * 0.3;
    const trunkHeight = obstacle.height * 0.6;
    const crownRadius = obstacle.width * 0.4;
    
    // Tree shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(centerX + depth/2, obstacle.y + obstacle.height + depth/2, crownRadius * 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Trunk
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(centerX - trunkWidth/2, obstacle.y + obstacle.height - trunkHeight, trunkWidth, trunkHeight);
    
    // Trunk 3D effect
    ctx.fillStyle = this.darkenColor('#8B4513', 0.3);
    ctx.fillRect(centerX - trunkWidth/2 + depth/2, obstacle.y + obstacle.height - trunkHeight + depth/2, trunkWidth/2, trunkHeight);
    
    // Tree crown (multiple layers for 3D effect)
    ctx.fillStyle = this.darkenColor(obstacle.color, 0.3);
    ctx.beginPath();
    ctx.arc(centerX + depth/3, obstacle.y + crownRadius + depth/3, crownRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = obstacle.color;
    ctx.beginPath();
    ctx.arc(centerX, obstacle.y + crownRadius, crownRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlights
    ctx.fillStyle = this.lightenColor(obstacle.color, 0.3);
    ctx.beginPath();
    ctx.arc(centerX - crownRadius/3, obstacle.y + crownRadius/2, crownRadius/2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBench(ctx, obstacle, depth) {
    // Park bench with 3D effect
    // Bench top
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    
    // 3D effect - side
    ctx.fillStyle = this.darkenColor(obstacle.color, 0.4);
    ctx.beginPath();
    ctx.moveTo(obstacle.x + obstacle.width, obstacle.y);
    ctx.lineTo(obstacle.x + obstacle.width + depth, obstacle.y + depth);
    ctx.lineTo(obstacle.x + obstacle.width + depth, obstacle.y + obstacle.height + depth);
    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
    ctx.closePath();
    ctx.fill();
    
    // Bench legs
    const legWidth = 8;
    const legHeight = obstacle.height + 10;
    ctx.fillStyle = this.darkenColor(obstacle.color, 0.2);
    
    // Left legs
    ctx.fillRect(obstacle.x + 5, obstacle.y + obstacle.height, legWidth, legHeight);
    ctx.fillRect(obstacle.x + 15, obstacle.y + obstacle.height, legWidth, legHeight);
    
    // Right legs
    ctx.fillRect(obstacle.x + obstacle.width - 23, obstacle.y + obstacle.height, legWidth, legHeight);
    ctx.fillRect(obstacle.x + obstacle.width - 13, obstacle.y + obstacle.height, legWidth, legHeight);
    
    // Backrest
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y - 20, obstacle.width, 15);
  }

  // Enhanced aggressive turkey drawing
  drawTurkey(turkey) {
    const ctx = this.ctx;
    
    // Update animation
    turkey.animFrame = (turkey.animFrame || 0) + 0.2;
    if (turkey.animFrame >= 8) turkey.animFrame = 0;
    
    const bobOffset = Math.sin(turkey.animFrame * 2) * (turkey.chasing ? 3 : 1);
    const aggressionScale = 1 + (turkey.aggressionLevel || 0) * 0.2;
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(turkey.x + turkey.width/2, turkey.y + turkey.height + 5, 
                turkey.width/2 * aggressionScale, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Body (changes color with aggression)
    let bodyColor = turkey.chasing ? '#AA0000' : '#8B4513';
    if (turkey.aggressionLevel > 0.5) {
      bodyColor = turkey.chasing ? '#FF0000' : '#A0522D';
    }
    
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(turkey.x + turkey.width/2, turkey.y + turkey.height/2 + bobOffset, 
                18 * aggressionScale, 15 * aggressionScale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Tail feathers (more dramatic when aggressive)
    const featherCount = turkey.chasing ? 7 : 5;
    const featherSpread = turkey.chasing ? 0.4 : 0.3;
    
    for (let i = 0; i < featherCount; i++) {
      const angle = (i - featherCount/2) * featherSpread;
      const featherLength = turkey.chasing ? 20 : 16;
      const featherX = turkey.x + turkey.width/2 - Math.cos(angle) * 15;
      const featherY = turkey.y + turkey.height/2 - Math.sin(angle) * 10 + bobOffset;
      
      // Feather colors
      const featherColors = ['#654321', '#8B4513', '#A0522D'];
      ctx.fillStyle = featherColors[i % 3];
      
      ctx.save();
      ctx.translate(featherX, featherY);
      ctx.rotate(angle);
      ctx.fillRect(-3, -featherLength/2, 6, featherLength);
      
      // Feather tip
      ctx.fillStyle = turkey.chasing ? '#FF4444' : '#D2691E';
      ctx.fillRect(-2, -featherLength/2, 4, 4);
      ctx.restore();
    }
    
    // Wings (flapping when chasing)
    ctx.fillStyle = '#A0522D';
    const wingFlap = turkey.chasing ? Math.sin(turkey.animFrame * 4) * 3 : 0;
    
    // Left wing
    ctx.save();
    ctx.translate(turkey.x + 8, turkey.y + 12 + bobOffset);
    ctx.rotate(wingFlap * 0.1);
    ctx.fillRect(0, 0, 12, 16);
    ctx.restore();
    
    // Right wing
    ctx.save();
    ctx.translate(turkey.x + 25, turkey.y + 12 + bobOffset);
    ctx.rotate(-wingFlap * 0.1);
    ctx.fillRect(0, 0, 12, 16);
    ctx.restore();
    
    // Neck (longer when aggressive)
    const neckHeight = turkey.chasing ? 16 : 12;
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(turkey.x + 15, turkey.y + 5 + bobOffset, 8, neckHeight);
    
    // Head (larger when aggressive)
    const headSize = turkey.chasing ? 8 : 6;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(turkey.x + 19, turkey.y + 8 + bobOffset, headSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Beak (open when chasing) - using school gold
    ctx.fillStyle = '#F5A623';
    if (turkey.chasing) {
      // Open beak
      ctx.beginPath();
      ctx.moveTo(turkey.x + 26, turkey.y + 6 + bobOffset);
      ctx.lineTo(turkey.x + 32, turkey.y + 4 + bobOffset);
      ctx.lineTo(turkey.x + 30, turkey.y + 8 + bobOffset);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(turkey.x + 26, turkey.y + 10 + bobOffset);
      ctx.lineTo(turkey.x + 32, turkey.y + 12 + bobOffset);
      ctx.lineTo(turkey.x + 30, turkey.y + 8 + bobOffset);
      ctx.fill();
    } else {
      // Closed beak
      ctx.beginPath();
      ctx.moveTo(turkey.x + 26, turkey.y + 8 + bobOffset);
      ctx.lineTo(turkey.x + 30, turkey.y + 6 + bobOffset);
      ctx.lineTo(turkey.x + 26, turkey.y + 10 + bobOffset);
      ctx.fill();
    }
    
    // Wattle (redder when aggressive)
    ctx.fillStyle = turkey.chasing ? '#FF0000' : '#FF6B6B';
    ctx.beginPath();
    ctx.arc(turkey.x + 19, turkey.y + 14 + bobOffset, turkey.chasing ? 4 : 3, 0, Math.PI);
    ctx.fill();
    
    // Eyes (red when chasing)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(turkey.x + 21, turkey.y + 6 + bobOffset, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupil
    ctx.fillStyle = turkey.chasing ? '#FF0000' : 'black';
    ctx.beginPath();
    ctx.arc(turkey.x + 22, turkey.y + 6 + bobOffset, turkey.chasing ? 2 : 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Angry eyebrow when chasing
    if (turkey.chasing) {
      ctx.strokeStyle = '#AA0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(turkey.x + 18, turkey.y + 3 + bobOffset);
      ctx.lineTo(turkey.x + 24, turkey.y + 5 + bobOffset);
      ctx.stroke();
    }
    
    // Legs (faster movement when chasing) - using school gold
    ctx.fillStyle = '#F5A623';
    const legSpeed = turkey.chasing ? 4 : 2;
    const legBob1 = Math.sin(turkey.animFrame * legSpeed) * 2;
    const legBob2 = Math.sin(turkey.animFrame * legSpeed + Math.PI) * 2;
    
    ctx.fillRect(turkey.x + 12, turkey.y + turkey.height - 5 + legBob1, 4, 10);
    ctx.fillRect(turkey.x + 22, turkey.y + turkey.height - 5 + legBob2, 4, 10);
    
    // Feet (claws extended when aggressive) - using school gold
    ctx.strokeStyle = '#F5A623';
    ctx.lineWidth = turkey.chasing ? 3 : 2;
    
    // Left foot
    ctx.beginPath();
    ctx.moveTo(turkey.x + 10, turkey.y + turkey.height + 5 + legBob1);
    ctx.lineTo(turkey.x + 18, turkey.y + turkey.height + 5 + legBob1);
    if (turkey.chasing) {
      // Extended claws
      ctx.moveTo(turkey.x + 8, turkey.y + turkey.height + 3 + legBob1);
      ctx.lineTo(turkey.x + 10, turkey.y + turkey.height + 5 + legBob1);
    }
    ctx.stroke();
    
    // Right foot
    ctx.beginPath();
    ctx.moveTo(turkey.x + 20, turkey.y + turkey.height + 5 + legBob2);
    ctx.lineTo(turkey.x + 28, turkey.y + turkey.height + 5 + legBob2);
    if (turkey.chasing) {
      // Extended claws
      ctx.moveTo(turkey.x + 28, turkey.y + turkey.height + 3 + legBob2);
      ctx.lineTo(turkey.x + 30, turkey.y + turkey.height + 5 + legBob2);
    }
    ctx.stroke();
    
    // Dust clouds when running
    if (turkey.chasing && Math.random() < 0.3) {
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: turkey.x + turkey.width/2 + (Math.random() - 0.5) * 10,
          y: turkey.y + turkey.height + 5,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * -2,
          life: 15,
          maxLife: 15,
          color: '#D2B48C',
          size: Math.random() * 3 + 1,
          type: 'dust'
        });
      }
    }
  }
  
  // Helper function to darken colors
  darkenColor(color, factor) {
    const rgb = parseInt(color.slice(1), 16);
    const r = Math.floor((rgb >> 16) * (1 - factor));
    const g = Math.floor(((rgb >> 8) & 255) * (1 - factor));
    const b = Math.floor((rgb & 255) * (1 - factor));
    return `rgb(${r},${g},${b})`;
  }

  lightenColor(color, factor) {
    const rgb = parseInt(color.slice(1), 16);
    const r = Math.min(255, Math.floor((rgb >> 16) + (255 - (rgb >> 16)) * factor));
    const g = Math.min(255, Math.floor(((rgb >> 8) & 255) + (255 - ((rgb >> 8) & 255)) * factor));
    const b = Math.min(255, Math.floor((rgb & 255) + (255 - (rgb & 255)) * factor));
    return `rgb(${r},${g},${b})`;
  }
  
  isColliding(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }
  
  render() {
    // Clear canvas with green playground background
    const bgGradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    bgGradient.addColorStop(0, '#90EE90');
    bgGradient.addColorStop(0.5, '#7ED321');
    bgGradient.addColorStop(1, '#5CB85C');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw playground elements
    this.drawPlayground();
    
    // Draw 3D obstacles
    this.obstacles.forEach(obstacle => {
      this.drawObstacle(obstacle);
    });
    
    // Draw bins with new realistic style
    this.bins.forEach(bin => {
      this.drawBin(bin);
    });
    
    // Draw realistic trash items
    this.trash.forEach(item => {
      this.drawRealisticTrash(item, item.x, item.y);
    });
    
    // Draw enemies (realistic bush turkeys)
    this.enemies.forEach(enemy => {
      this.drawTurkey(enemy);
    });
    
    // Draw player with new cartoon style
    this.drawPlayer();
    
    // Draw particle effects
    this.particles.forEach(particle => {
      this.ctx.save();
      this.ctx.globalAlpha = particle.alpha || 1;
      
      if (particle.type === 'scoreText') {
        this.ctx.fillStyle = particle.color;
        this.ctx.font = `bold ${particle.size}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#2D5016';
        this.ctx.lineWidth = 2;
        this.ctx.strokeText(particle.text, particle.x, particle.y);
        this.ctx.fillText(particle.text, particle.x, particle.y);
      } else {
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      this.ctx.restore();
    });
  }
  
  drawPlayground() {
    // Draw some playground equipment
    // Swing set
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fillRect(600, 400, 10, 100);
    this.ctx.fillRect(700, 400, 10, 100);
    this.ctx.fillRect(590, 400, 130, 10);
    
    // Slide
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillRect(500, 100, 80, 20);
    this.ctx.fillRect(500, 120, 20, 80);
    
    // Trees
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fillRect(300, 450, 15, 60);
    this.ctx.fillRect(750, 50, 15, 80);
    
    this.ctx.fillStyle = '#228B22';
    this.ctx.beginPath();
    this.ctx.arc(307, 440, 30, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(757, 40, 35, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  updateUI() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('carrying').textContent = this.player.carrying ? 
      this.player.carrying.item : 'Nothing';
  }
  
  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      document.getElementById('timer').textContent = this.timeLeft;
      
      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);
  }
  
  endGame() {
    this.gameState = 'gameOver';
    clearInterval(this.timerInterval);
    document.getElementById('finalScore').textContent = this.score;
    document.getElementById('gameOver').style.display = 'block';
  }
  
  submitScore() {
    const playerName = document.getElementById('playerName').value.trim() || 'Anonymous';
    const scores = this.getStoredScores();
    scores.push({ name: playerName, score: this.score, date: new Date().toLocaleDateString() });
    scores.sort((a, b) => b.score - a.score);
    scores.splice(10); // Keep only top 10
    
    localStorage.setItem('recycleGameScores', JSON.stringify(scores));
    this.displayLeaderboard();
  }
  
  loadLeaderboard() {
    this.displayLeaderboard();
  }
  
  getStoredScores() {
    const stored = localStorage.getItem('recycleGameScores');
    return stored ? JSON.parse(stored) : [];
  }
  
  displayLeaderboard() {
    const scores = this.getStoredScores();
    const scoresDiv = document.getElementById('scores');
    scoresDiv.innerHTML = scores.slice(0, 5).map((score, index) => 
      `${index + 1}. ${score.name}: ${score.score}`
    ).join('<br>');
  }
  
  restart() {
    // Reset game state
    this.gameState = 'playing';
    this.timeLeft = this.gameTime;
    this.score = 0;
    this.player.x = 400;
    this.player.y = 300;
    this.player.carrying = null;
    this.player.vx = 0;
    this.player.vy = 0;
    
    // Reset game objects
    this.trash = [];
    this.enemies = [];
    this.spawnTrash();
    this.spawnEnemies();
    
    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('playerName').value = '';
    
    // Restart timer
    this.updateUI();
    this.startTimer();
  }
  
  gameLoop() {
    if (this.gameState === 'playing') {
      this.updatePlayer();
      this.updateEnemies();
      this.updateParticles();
      this.checkCollisions();
    }
    
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// Start the game when page loads
window.addEventListener('load', () => {
  window.game = new SuperRecycleGame();
});

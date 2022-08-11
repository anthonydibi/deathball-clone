

const API_URL = 'https://dibiaggdotio.herokuapp.com';

var config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1000,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 900 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

var arena;
var bluePlayer;
var redPlayer;
var blueGoal;
var redGoal;
var blueScore;
var redScore;
var blueGoalCollider;
var redGoalCollider;
var energySpheres;
var ball;
var scored = false;
var scoreText;
var slowmoCooldown;

var game = new Phaser.Game(config);

function preload ()
{
    this.physics.world.TILE_BIAS = 36;
    arena = new Arena(this, 'assets/Tileset.png', 'assets/map2.json', 'dungeon', 'Platforms')
    arena.preload();
    this.load.image('energysphere', 'assets/Energy_Ball.png');
    this.load.image('ball', 'assets/ball.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    bluePlayer = new Player(this, 1, 0x0000ff, 140, 920, "dude", "X", "W", "D", "S", "A");
    redPlayer = new Player(this, 2, 0xff0000, 1780, 920, "dude", "L", "UP", "RIGHT", "DOWN", "LEFT");
    this.physics.world.setFPS(240);
}

function create ()
{
    //  A simple background for our game
    energySpheres = this.physics.add.staticGroup();
    arena.create();
    bluePlayer.create();
    redPlayer.create();
    bluePlayer.movementEnabled = false;
    redPlayer.movementEnabled = false;
    blueGoal = new Phaser.GameObjects.Rectangle(this, 16, 664, 32, 210, 0xff0000);
    redGoal = new Phaser.GameObjects.Rectangle(this, 1904, 664, 32, 210, 0x0000ff);
    var goals = this.physics.add.staticGroup();
    this.add.existing(blueGoal);
    this.add.existing(redGoal);
    goals.add(blueGoal);
    goals.add(redGoal);

    blueScore = this.add.text(44, 330, '3', { font: "40px arcade" });
    redScore = this.add.text(1856, 330, '3', { font: "40px arcade"});

    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [ { key: 'dude', frame: 4 } ],
        frameRate: 20
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    this.physics.add.collider(bluePlayer.gameObject, arena.platforms);
    this.physics.add.collider(redPlayer.gameObject, arena.platforms);

    let balls = this.physics.add.group();

    ball = balls.create(this.cameras.main.centerX, 900, "ball");
    ball.setMaxVelocity(1000);
    ball.body.setAllowGravity(false);

    ball.setBounce(.7, .45);

    ball.setScale(.47);

    ball.setMass(1);

    this.physics.add.collider(balls, arena.platforms, (ball, tile) => {
        ball.setVelocityX(ball.body.velocity.x * .99);
    });
    this.physics.add.collider(bluePlayer.gameObject, balls);
    this.physics.add.collider(redPlayer.gameObject, balls);
    blueGoalCollider = this.physics.add.collider(balls, blueGoal, () => goal(this, "left"));
    redGoalCollider = this.physics.add.collider(balls, redGoal, () => goal(this, "right"));
    this.physics.add.collider(balls, energySpheres);
    this.physics.add.collider(balls, energySpheres, ballCollidesEnergySphere);
    this.physics.add.overlap(balls, energySpheres, pinch);

    var controlsText = this.add.text(300, 55, `Controls:\n Blue (left): ${bluePlayer.upInput} ${bluePlayer.rightInput} ${bluePlayer.downInput} ${bluePlayer.leftInput} to move, ${bluePlayer.actionInput} to jump/dash\n Red (right): ${redPlayer.upInput} ${redPlayer.rightInput} ${redPlayer.downInput} ${redPlayer.leftInput} to move, ${redPlayer.actionInput} to jump/dash\n Press SPACE to show/hide controls`, { font: "20px arcade"});
    var showControlsAction = this.input.keyboard.addKey("SPACE");
    showControlsAction.on('down', () => { controlsText.setVisible(!controlsText.visible); });
    controlsText.setOrigin(0.5);

    bluePlayer.enterName().then(res => {
        this.input.keyboard.off("keydown");
        redPlayer.enterName().then(res2 => {
            this.input.keyboard.off("keydown");
            res.text.visible = false;
            res2.text.visible = false;
            controlsText.setVisible(false);
            redPlayer.movementEnabled = true;
            bluePlayer.movementEnabled = true;
            countdownRound(this);
        });
    });
}

function update ()
{
    this.physics.world.wrap(ball);
    bluePlayer.update();
    redPlayer.update();
    //slowmo when ball is near goal, has 20s cooldown
    let ballCenter = ball.getCenter();
    let blueGoalCenter = blueGoal.getCenter();
    let redGoalCenter = redGoal.getCenter();
    let blueGoalDist = Phaser.Math.Distance.Between(ballCenter.x, ballCenter.y, blueGoalCenter.x, blueGoalCenter.y);
    let redGoalDist = Phaser.Math.Distance.Between(ballCenter.x, ballCenter.y, redGoalCenter.x, redGoalCenter.y);
    if((blueGoalDist < 250 || redGoalDist < 250) && ballCenter.y < (blueGoalCenter.y + blueGoal.height/2) /*&& (blueGoalDist < redGoalDist ? ball.body.velocity.x <= 0 : ball.body.velocity.x >= 0)*/){
        if(slowmoCooldown ? slowmoCooldown.getRemaining() === 0 : true){
            this.physics.world.timeScale = 4; 
            this.time.timeScale = 4;
            slowmoCooldown = this.time.addEvent({
                delay: 15000,
            })
        }
    }
    else if(!scored){
        this.physics.world.timeScale = 1; 
        this.time.timeScale = 1;
    }
}

function goal(scene, side){
    if(scored) return;
    scored = true;
    scene.physics.world.timeScale = 4; 
    scene.time.timeScale = 4;
    if(side === "left"){
        blueScore.setText(parseInt(blueScore.text) - 1);
    }
    else{
        redScore.setText(parseInt(redScore.text) - 1);
    }
    let blueWin = parseInt(redScore.text) === 0;
    let redWin = parseInt(blueScore.text) === 0;
    if(blueWin || redWin){
        const api = new ApiManager('https://dibiaggdotio.herokuapp.com');
        if(blueWin){
            api.uploadGame(bluePlayer.name, redPlayer.name, parseInt(blueScore.text), parseInt(redScore.text));
        }
        else if(redWin){
            api.uploadGame(redPlayer.name, bluePlayer.name, parseInt(redScore.text), parseInt(blueScore.text));
        }
        var gameOverText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, 'GAME OVER', { font: "100px arcade" });
        gameOverText.setOrigin(0.5);
        var gameOverTextTimer = scene.time.addEvent({
            delay:15000,
            callback: () => {
                gameOverText.destroy();
                var winnerText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, (blueWin ? bluePlayer.name : "") + (redWin ? redPlayer.name : "") + " WINS", { font: "100px arcade" });
                winnerText.setOrigin(0.5);
                var winnerTextTimer = scene.time.addEvent({
                    delay: 15000,
                    callback: () => {
                        winnerText.destroy();
                        blueScore.setText("3");
                        redScore.setText("3");
                        var resetTimer = scene.time.addEvent({
                            delay: 5000,                
                            callback: () => reset(scene),
                            loop: false,
                            timeScale: 2
                        });
                    }
                })
            }
        })
    }
    else{
        var resetTimer = scene.time.addEvent({
            delay: 50000,                
            callback: () => reset(scene),
            loop: false,
            timeScale: 4
        });
    }
}

function reset(scene){
    scored = false;
    scene.physics.world.timeScale = 1;
    scene.time.timeScale = 1;
    bluePlayer.reset();
    redPlayer.reset(); 
    ball.setPosition(scene.cameras.main.centerX, 900);
    ball.setVelocity(0);
    ball.body.setAllowGravity(false);
    countdownRound(scene);
}

function countdownRound(scene){
    bluePlayer.left.isDown = false;
    bluePlayer.right.isDown = false;
    redPlayer.left.isDown = false;
    redPlayer.right.isDown = false;
    scene.input.keyboard.manager.enabled = false;
    var countdownText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, '3', { font: "100px arcade" });
    countdownText.setOrigin(0.5);
    var timer = scene.time.addEvent({
        delay: 1000,                
        loop: true,
        callback: () => {
            countdownText.setText(parseInt(countdownText.text) - 1);
            if(countdownText.text <= 0)
            {
                countdownText.destroy();
                timer.remove();
                scene.input.keyboard.manager.enabled = true;
                ball.body.setAllowGravity(true);
            }
        },
    });
}

function ballCollidesEnergySphere(ball, sphere){ //some yucky linear algebra, just gets a vector from bounce sphere to ball, puts the ball at the edge of the sphere and then sets the velocity of the ball to the bounce sphere->ball vector + a bit of the incoming velocity
    let incomingSpeed = ball.body.velocity.length();
    let ballCenter = ball.getCenter();
    let sphereCenter = sphere.getCenter();
    let angle = Phaser.Math.Angle.Between(ballCenter.x, ballCenter.y, sphereCenter.x, sphereCenter.y);
    var sphereToBall = new Phaser.Math.Vector2(1, 0);
    // let maxSphereDist = sphere.body.width/2;
    // let maxBallDist = Math.sqrt(Math.pow(ball.body.width/2, 2) * 2);
    // sphereToBall.scale(maxSphereDist + maxBallDist);
    sphereToBall.setAngle(angle);
    sphereToBall.scale(500 + incomingSpeed/8);
    sphereToBall.scale(-1);
    // let newPos = new Phaser.Math.Vector2(sphereCenter.x + sphereToBall.x, sphereCenter.y + sphereToBall.y);
    // ball.setPosition(newPos.x, newPos.y).refreshBody();
    // let bounceVector = new Phaser.Math.Vector2(1, 0);
    // bounceVector.setAngle(angle);
    // bounceVector.scale(-1);
    // bounceVector.scale(560 + incomingSpeed/3);
    // ball.setVelocity(bounceVector.x, bounceVector.y);
    ball.setVelocity(sphereToBall.x, sphereToBall.y);
    return false;
}

function pinch(ball, sphere){
    let incomingSpeed = ball.body.velocity.length();
    let ballCenter = ball.getCenter();
    let sphereCenter = sphere.getCenter();
    let angle = Phaser.Math.Angle.Between(ballCenter.x, ballCenter.y, sphereCenter.x, sphereCenter.y);
    let sphereToBall = new Phaser.Math.Vector2(1, 0);
    let sphereToBallDist = Phaser.Math.Distance.Between(ballCenter.x, ballCenter.y, sphereCenter.x, sphereCenter.y);
    // let maxSphereDist = sphere.body.width/2;
    // let maxBallDist = Math.sqrt(Math.pow(ball.body.width/2, 2) * 2);
    // sphereToBall.scale(maxSphereDist + maxBallDist);
    sphereToBall.setAngle(angle);
    sphereToBall.scale(800 + 400/sphereToBallDist + incomingSpeed/6);
    sphereToBall.scale(-1);
    // let newPos = new Phaser.Math.Vector2(sphereCenter.x + sphereToBall.x, sphereCenter.y + sphereToBall.y);
    // ball.setPosition(newPos.x, newPos.y).refreshBody();
    // let bounceVector = new Phaser.Math.Vector2(1, 0);
    // bounceVector.setAngle(angle);
    // bounceVector.scale(-1);
    // bounceVector.scale(560 + incomingSpeed/3);
    // ball.setVelocity(bounceVector.x, bounceVector.y);
    ball.setVelocity(sphereToBall.x, sphereToBall.y);
    return false;
}

class Player{
    constructor(scene, playerNum, color, startX, startY, sprite, actionInput, upInput, rightInput, downInput, leftInput){
        this.scene = scene;
        this.playerNum = playerNum;
        this.color = color;
        this.startX = startX;
        this.startY = startY;
        this.sprite = sprite;
        this.actionInput = actionInput;
        this.upInput = upInput;
        this.rightInput = rightInput;
        this.downInput = downInput;
        this.leftInput = leftInput;
        this.dashing = false;
        this.inputVector = new Phaser.Math.Vector2(0, 0);
        this.velocityScalar = 1;
        this.movementEnabled = true;
    }

    create(){
        this.gameObject = this.scene.physics.add.sprite(this.startX, this.startY, this.sprite);
        this.gameObject.setDepth(100);
        this.gameObject.setCollideWorldBounds(false);
        this.gameObject.setScale(1.2, .8);
        this.gameObject.setMass(1);
        this.gameObject.setBounce(0, 0.1);
        this.gameObject.setPushable(false);
        this.up = this.scene.input.keyboard.addKey(this.upInput);
        this.right = this.scene.input.keyboard.addKey(this.rightInput);
        this.down = this.scene.input.keyboard.addKey(this.downInput);
        this.left = this.scene.input.keyboard.addKey(this.leftInput);
        this.action = this.scene.input.keyboard.addKey(this.actionInput);
        this.action.on('down', () => { this.onAction(); });
    }

    update(){
        var maxVelocity = 450 * this.velocityScalar;
        var up, right, down, left = 0;
        up = this.up.isDown ? 1 : 0;
        right = this.right.isDown ? 1 : 0;
        down = this.down.isDown ? 1 : 0;
        left = this.left.isDown ? 1 : 0;
        if(!this.movementEnabled) return;
        if(!this.dashing || (this.gameObject.body.velocity.x < 0) != (right - left < 0) || this.gameObject.body.velocity.x == 0){
            this.dashing = false;
            if(this.velocityScalar == 2.5){
                this.velocityScalar = 1.5;
            }
        }
        if(this.gameObject.body.blocked.down && !this.dashing){
            this.velocityScalar = 1;
        }
        var force = (right - left) * 25 * this.velocityScalar;
        if(Math.abs(this.gameObject.body.velocity.x) < maxVelocity || ((this.gameObject.body.velocity.x < 0) != (force < 0)) ) this.gameObject.body.velocity.x += force;
        // if(this.gameObject.body.velocity.x < -maxVelocity) this.gameObject.setVelocityX(-maxVelocity);
        // if(this.gameObject.body.velocity.x > maxVelocity) this.gameObject.setVelocityX(maxVelocity);
        if(force > 0){
            this.gameObject.anims.play("right");
        }
        else if(force < 0){
            this.gameObject.anims.play("left");
        }
        else{
            this.gameObject.anims.play("turn");
        }
        if(up == 0 && right == 0 && down == 0 && left == 0){
            this.gameObject.setVelocityX(0);
            this.dashing = false;
        }
        this.scene.physics.world.wrap(this.gameObject, 15);
    }

    enterName(){
        return new Promise((resolve, reject) => {
            this.nameEntered = false;
            let nameEntry = this.scene.add.text(this.startX, this.startY - 34, '', { font: '20px arcade', fill: '#ffffff' });
            let nameEntryPrompt = this.scene.add.text(this.scene.cameras.main.centerX, this.scene.cameras.main.centerY - 200, `PLAYER ${this.playerNum} ENTER NAME`, { font: "70px arcade" });
            let nameEntryPrompt2 = this.scene.add.text(this.scene.cameras.main.centerX, this.scene.cameras.main.centerY - 100, `TYPE THEN PRESS ENTER`, { font: "40px arcade" });
            nameEntryPrompt.setOrigin(0.5);
            nameEntryPrompt2.setOrigin(0.5);
            nameEntry.setOrigin(0.5);
            (function(nameText, namePromptText, namePromptText2, scene, context) {
                var handler = scene.input.keyboard.on("keydown", function() {
                    if (event.keyCode === 8 && nameText.text.length > 0)
                    {
                        nameText.text = nameText.text.substr(0, nameText.text.length - 1);
                    }
                    else if (event.keyCode === 32 || (event.keyCode >= 48 && event.keyCode < 90 && nameText.text.length < 5))
                    {
                        nameText.text += event.key.toUpperCase();
                    }
                    else if (event.keyCode === 13){
                        context.name = nameText.text;
                        namePromptText.destroy();
                        namePromptText2.destroy();
                        context.nameEntryDisabled = true;
                        resolve({text: nameEntry, handler: handler});
                    }
                });
            })(nameEntry, nameEntryPrompt, nameEntryPrompt2, this.scene, this)
        })
    }

    onAction(){
        if(!this.movementEnabled) return;
        var playerCenter = this.gameObject.getCenter();
        var ballCenter = ball.getCenter();
        if(Phaser.Math.Distance.Between(playerCenter.x, playerCenter.y, ballCenter.x, ballCenter.y) <= (this.gameObject.width/2 + ball.width/2) + 2 && this.gameObject.body.blocked.down ){ // jump the ball if player is on ground and near it
            ball.setVelocityY(ball.body.velocity.y - 650);
        }
        if(!this.down.isDown){
            this.gameObject.setVelocityY(-620);
            if(!this.gameObject.body.blocked.down){
                this.velocityScalar = 1.5;
                this.dashing = true;
            }
        }
        else if(this.left.isDown && this.down.isDown && this.gameObject.body.blocked.down){
            this.velocityScalar = 2.5;
            this.dashing = true;
        }
        else if(this.right.isDown && this.down.isDown && this.gameObject.body.blocked.down){
            this.velocityScalar = 2.5;
            this.dashing = true;
        }
        else if(this.down.isDown && !this.gameObject.body.blocked.down){
            this.gameObject.setVelocityY(500);
        }
        if(this.gameObject.body.blocked.down){
            return;
        }
        if(!this.energySphere){
            this.energySphere = energySpheres.create(playerCenter.x, playerCenter.y, "energysphere");
            this.energySphere.body.setCircle(this.energySphere.width/2);
            this.energySphere.setScale(6.5);
            this.energySphere.setTintFill(this.color);
        }
        else{
            let lastSphereCenter = this.energySphere.getCenter();
            let energySphereMirage = this.scene.add.image(lastSphereCenter.x, lastSphereCenter.y, "energysphere");
            energySphereMirage.setScale(6.5);
            energySphereMirage.setTintFill(this.color);
            let mirageFadeTimer = this.scene.time.addEvent({
                delay: 50,
                loop: true,
                timeScale: this.scene.time.timeScale,
                callback: () => {
                    energySphereMirage.setAlpha(energySphereMirage.alpha - .15);
                    if(energySphereMirage.alpha < 0){
                        mirageFadeTimer.destroy();
                    }
                }
            })
            this.energySphere.setPosition(playerCenter.x, playerCenter.y).refreshBody();
        }
    }

    reset(){
        this.gameObject.setPosition(this.startX, this.startY);   
        this.energySphere?.setPosition(-100, -100).refreshBody();
        this.gameObject.setVelocity(0);
    }
}

class Arena{
    constructor(scene, tileset, tilemap, tilesetKey, platformLayerKey){
        this.scene = scene;
        this.tileset = tileset;
        this.tilemap = tilemap;
        this.tilesetKey = tilesetKey;
        this.platformLayerKey = platformLayerKey;
    }

    preload(){
        this.scene.load.image('tiles', this.tileset);
        this.scene.load.tilemapTiledJSON('map', this.tilemap);
    }

    create(){
        const map = this.scene.make.tilemap({key: "map"});
        const tileset = map.addTilesetImage(this.tilesetKey, 'tiles');
        this.platforms = map.createLayer(this.platformLayerKey, tileset, 0, 0);
        this.platforms.setCollisionByExclusion(-1, true);
    }
}

class ApiManager{
    constructor(API_URL){
        this.API_URL = API_URL;
    }

    uploadGame(winner, loser, winnerscore, loserscore){
        const data = {
            winner: winner,
            loser: loser,
            winnerscore: winnerscore,
            loserscore: loserscore
        }
        fetch(this.API_URL + '/deathball/games', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            },
            mode: 'cors'
        });
    }
}
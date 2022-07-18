
const API_URL = 'https://dibiaggdotio.herokuapp.com';

var config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
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
    arena = new Arena(this, 'assets/Tileset.png', 'assets/map1.json', 'dungeon', 'Tile Layer 1')
    arena.preload();
    this.load.image('energysphere', 'assets/Energy_Ball.png');
    this.load.image('ball', 'assets/ball.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    bluePlayer = new Player(this, 0x0000ff, 100, 600, "dude", "X", "W", "D", "S", "A");
    redPlayer = new Player(this, 0xff0000, 1180, 600, "dude", "L", "UP", "RIGHT", "DOWN", "LEFT");
}

function create ()
{
    //  A simple background for our game
    energySpheres = this.physics.add.staticGroup();
    arena.create();
    bluePlayer.create();
    redPlayer.create();
    blueGoal = new Phaser.GameObjects.Rectangle(this, 16, 440, 32, 144, 0xff0000);
    redGoal = new Phaser.GameObjects.Rectangle(this, 1268, 440, 32, 144, 0x0000ff);
    var goals = this.physics.add.staticGroup();
    this.add.existing(blueGoal);
    this.add.existing(redGoal);
    goals.add(blueGoal);
    goals.add(redGoal);

    blueScore = this.add.text(24, 220, '3', { font: "40px Arial" });
    redScore = this.add.text(1236, 220, '3', { font: "40px Arial"});

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

    ball = balls.create(this.cameras.main.centerX, 620, "ball");
    ball.body.setCircle(ball.body.width/2);
    ball.setMaxVelocity(800);
    ball.body.setAllowGravity(false);

    ball.setBounce(.6, .6);

    ball.setScale(.3);

    ball.setMass(.5);

    this.physics.add.collider(balls, arena.platforms, (ball, tile) => {
        ball.setVelocityX(ball.body.velocity.x * .985);
    });
    this.physics.add.collider(bluePlayer.gameObject, balls);
    this.physics.add.collider(redPlayer.gameObject, balls);
    this.physics.add.collider(bluePlayer.gameObject, redPlayer.gameObject);
    blueGoalCollider = this.physics.add.collider(balls, blueGoal, () => goal(this, "left"));
    redGoalCollider = this.physics.add.collider(balls, redGoal, () => goal(this, "right"));
    this.physics.add.overlap(balls, energySpheres, ballCollidesEnergySphere);

    var controlsText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY/2, `Controls:\n Blue (left): ${bluePlayer.upInput} ${bluePlayer.rightInput} ${bluePlayer.downInput} ${bluePlayer.leftInput} to move, ${bluePlayer.actionInput} to jump/dash\n Red (right): ${redPlayer.upInput} ${redPlayer.rightInput} ${redPlayer.downInput} ${redPlayer.leftInput} to move, ${redPlayer.actionInput} to jump/dash\n Press SPACE to show/hide controls`, { font: "30px Arial"});
    var showControlsAction = this.input.keyboard.addKey("SPACE");
    showControlsAction.on('down', () => { controlsText.setVisible(!controlsText.visible); });
    controlsText.setOrigin(0.5);
    countdownRound(this);
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
    if((blueGoalDist < 200 || redGoalDist < 200) && ballCenter.y < blueGoalCenter.y && (blueGoalDist < redGoalDist ? ball.body.velocity.x > 0 : ball.body.velocity.x < 0)){
        if(slowmoCooldown ? slowmoCooldown.getRemaining() === 0 : true){
            this.physics.world.timeScale = 4; 
            this.time.timeScale = 4;
            slowmoCooldown = this.time.addEvent({
                delay: 20000,
                callback: () => {
                }
            })
        }
    }
    else if(!scored){
        this.physics.world.timeScale = 1; 
        this.time.timeScale = 1;
    }
}

function goal(scene, side){
    scored = true;
    blueGoalCollider.active = false;
    redGoalCollider.active = false;
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
        var gameOverText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, 'GAME OVER', { font: "100px Arial" });
        gameOverText.setOrigin(0.5);
        var gameOverTextTimer = scene.time.addEvent({
            delay:15000,
            callback: () => {
                gameOverText.destroy();
                var winnerText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, (blueWin ? "BLUE" : "") + (redWin ? "RED" : "") + " WINS", { font: "100px Arial" });
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
    blueGoalCollider.active = true;
    redGoalCollider.active = true;
    scene.physics.world.timeScale = 1;
    scene.time.timeScale = 1;
    bluePlayer.reset();
    redPlayer.reset(); 
    ball.setPosition(scene.cameras.main.centerX, 620);
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
    var countdownText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, '3', { font: "100px Arial" });
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
    sphereToBall.scale(sphere.width/2 + ball.width/2);
    sphereToBall.setAngle(angle);
    sphereToBall.scale(-1);
    let newPos = new Phaser.Math.Vector2(sphereCenter.x + sphereToBall.x, sphereCenter.y + sphereToBall.y);
    ball.setPosition(newPos.x, newPos.y).refreshBody();
    sphereToBall.scale(.1);
    let bounceVector = new Phaser.Math.Vector2(1, 0);
    bounceVector.setAngle(angle);
    bounceVector.scale(-1);
    bounceVector.scale(500 + incomingSpeed/4);
    ball.setVelocity(bounceVector.x, bounceVector.y);
}

class Player{
    constructor(scene, color, startX, startY, sprite, actionInput, upInput, rightInput, downInput, leftInput){
        this.scene = scene;
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
    }

    create(){
        this.gameObject = this.scene.physics.add.sprite(this.startX, this.startY, this.sprite);
        this.gameObject.setCollideWorldBounds(false);
        this.up = this.scene.input.keyboard.addKey(this.upInput);
        this.right = this.scene.input.keyboard.addKey(this.rightInput);
        this.down = this.scene.input.keyboard.addKey(this.downInput);
        this.left = this.scene.input.keyboard.addKey(this.leftInput);
        this.action = this.scene.input.keyboard.addKey(this.actionInput);
        this.action.on('down', () => { this.onAction(); });
    }

    update(){
        var up, right, down, left = 0;
        up = this.up.isDown ? 1 : 0;
        right = this.right.isDown ? 1 : 0;
        down = this.down.isDown ? 1 : 0;
        left = this.left.isDown ? 1 : 0;
        var velocityX = (right - left) * 300;
        if(!this.dashing || (this.gameObject.body.velocity.x < 0) != (right - left < 0) || this.gameObject.body.velocity.x == 0){
            this.gameObject.setVelocityX(velocityX);
            this.dashing = false;
        }
        if(up == 0 && right == 0 && down == 0 && left == 0){
            this.gameObject.setVelocityX(0);
            this.dashing = false;
        }
        this.scene.physics.world.wrap(this.gameObject);
    }

    onAction(){
        var playerCenter = this.gameObject.getCenter();
        var ballCenter = ball.getCenter();
        if(Phaser.Math.Distance.Between(playerCenter.x, playerCenter.y, ballCenter.x, ballCenter.y) <= (this.gameObject.width/2 + ball.width/2) + 2 && this.gameObject.body.blocked.down ){ // jump the ball if player is on ground and near it
            ball.setVelocityY(-550);
        }
        if(!this.down.isDown){
            this.gameObject.setVelocityY(-550);
        }
        else if(this.left.isDown && this.down.isDown && this.gameObject.body.blocked.down){
            this.gameObject.setVelocityX(-800);
            this.dashing = true;
        }
        else if(this.right.isDown && this.down.isDown && this.gameObject.body.blocked.down){
            this.gameObject.setVelocityX(800);
            this.dashing = true;
        }
        else if(this.down.isDown && !this.gameObject.body.blocked.down){
            this.gameObject.setVelocityY(400);
        }
        if(this.gameObject.body.blocked.down){
            return;
        }
        if(!this.energySphere){
            this.energySphere = energySpheres.create(playerCenter.x, playerCenter.y, "energysphere");
            this.energySphere.body.setCircle(this.energySphere.width/2);
            this.energySphere.setScale(4.5);
            this.energySphere.setTintFill(this.color);
        }
        else{
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



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

var A;
var W;
var S;
var D;
var leftPlayer;
var rightPlayer;
var leftDashing;
var rightDashing;
var leftScore;
var rightScore;
var leftGoalCollider;
var rightGoalCollider;
var energySpheres;
var ball;
var stars;
var bombs;
var platforms;
var cursors;
var score = 0;
var gameOver = false;
var scoreText;

var game = new Phaser.Game(config);

function preload ()
{
    this.load.image('energysphere', 'assets/Energy_Ball.png');
    this.load.image('ball', 'assets/ball.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
  this.load.image('tiles', 'assets/Tileset.png');
  // Load the export Tiled JSON
  this.load.tilemapTiledJSON('map', 'assets/map1.json');
}

function create ()
{
    //  A simple background for our game
    const map = this.make.tilemap({key: "map"});
    const tileset = map.addTilesetImage('dungeon', 'tiles');
    const platforms = map.createLayer('Tile Layer 1', tileset, 0, 0);
    platforms.setCollisionByExclusion(-1, true);

    var leftGoal = new Phaser.GameObjects.Rectangle(this, 16, 440, 32, 144, 0xff0000);
    var rightGoal = new Phaser.GameObjects.Rectangle(this, 1268, 440, 32, 144, 0x0000ff);
    var goals = this.physics.add.staticGroup();
    this.add.existing(leftGoal);
    this.add.existing(rightGoal);
    goals.add(leftGoal);
    goals.add(rightGoal);

    leftScore = this.add.text(24, 220, '3', { font: "40px Arial" });
    rightScore = this.add.text(1236, 220, '3', { font: "40px Arial"});

    //  Here we create the ground.
    //  Scale it to fit the width of the game (the original sprite is 400x32 in size)

    //  Now let's create some ledges

    // The player and its settings
    leftPlayer = this.physics.add.sprite(100, 600, 'dude');
    rightPlayer = this.physics.add.sprite(1180, 600, 'dude');
    leftPlayer.scale = .8;
    rightPlayer.scale = .8;

    //  Player physics properties. Give the little guy a slight bounce.
    leftPlayer.setCollideWorldBounds(false);
    rightPlayer.setCollideWorldBounds(false);


    //  Our player animations, turning, walking left and walking right.
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

    //  Input Events
    cursors = this.input.keyboard.createCursorKeys();
    A = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    S = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    D = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    W = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

    this.physics.add.collider(leftPlayer, platforms);
    this.physics.add.collider(rightPlayer, platforms);

    let balls = this.physics.add.group();

    ball = balls.create(this.cameras.main.centerX, this.cameras.main.centerY, "ball");
    ball.body.setCircle(ball.body.width/2);
    ball.setMaxVelocity(800);

    ball.setBounce(.5, .7);

    ball.setScale(.3);

    ball.setMass(.5);

    energySpheres = this.physics.add.staticGroup();

    this.physics.add.collider(balls, platforms);
    this.physics.add.collider(leftPlayer, balls);
    this.physics.add.collider(rightPlayer, balls);
    this.physics.add.collider(leftPlayer, rightPlayer);
    leftGoalCollider = this.physics.add.collider(balls, leftGoal, () => goal(this, "left"));
    rightGoalCollider = this.physics.add.collider(balls, rightGoal, () => goal(this, "right"));
    this.physics.add.overlap(balls, energySpheres, ballCollidesEnergySphere);

    var leftPlayerAction = this.input.keyboard.addKey('X');  // Get key object
    var rightPlayerAction = this.input.keyboard.addKey('L');
    leftPlayerAction.on('down', () => { onPlayerAction(this); spawnEnergySphere(leftPlayer, "blue"); });
    rightPlayerAction.on('down', () => { onPlayerAction(this); spawnEnergySphere(rightPlayer, "red"); });
    countdownRound(this);
}

function goal(scene, side){
    leftGoalCollider.active = false;
    rightGoalCollider.active = false;
    scene.physics.world.timeScale = 2; 
    scene.time.timeScale = 2;
    if(side === "left"){
        leftScore.setText(parseInt(leftScore.text) - 1);
    }
    else{
        rightScore.setText(parseInt(rightScore.text) - 1);
    }
    let leftWin = parseInt(rightScore.text) === 0;
    let rightWin = parseInt(leftScore.text) === 0;
    if(leftWin || rightWin){
        var gameOverText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, 'GAME OVER', { font: "100px Arial" });
        gameOverText.setOrigin(0.5);
        var gameOverTextTimer = scene.time.addEvent({
            delay:6000,
            callback: () => {
                gameOverText.destroy();
                var winnerText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY, (leftWin ? "BLUE" : "") + (rightWin ? "RED" : "") + " WINS", { font: "100px Arial" });
                winnerText.setOrigin(0.5);
                var winnerTextTimer = scene.time.addEvent({
                    delay: 6000,
                    callback: () => {
                        winnerText.destroy();
                        leftScore.setText("3");
                        rightScore.setText("3");
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
            delay: 10000,                
            callback: () => reset(scene),
            loop: false,
            timeScale: 2
        });
    }
}

function reset(scene){
    leftGoalCollider.active = true;
    rightGoalCollider.active = true;
    scene.physics.world.timeScale = 1;
    scene.time.timeScale = 1;
    leftPlayer.setPosition(100, 600);
    rightPlayer.setPosition(1100, 600);
    leftPlayer.energySphere?.setPosition(-100, -100).refreshBody();
    rightPlayer.energySphere?.setPosition(-100, -100).refreshBody(); //move energy spheres out of scene
    ball.setPosition(scene.cameras.main.centerX, scene.cameras.main.centerY);
    ball.setVelocity(0);
    countdownRound(scene);
}

function countdownRound(scene){
    cursors.left.isDown = false;
    cursors.right.isDown = false;
    A.isDown = false;
    D.isDown = false;
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
    bounceVector.scale(500 + incomingSpeed/3);
    ball.setVelocity(bounceVector.x, bounceVector.y);
}

function spawnEnergySphere(player, color){
    if(player.body.blocked.down){
        return;
    }
    let center = player.getCenter();
    if(!player.energySphere){
        player.energySphere = energySpheres.create(center.x, center.y, "energysphere");
        player.energySphere.body.setCircle(player.energySphere.width/2);
        player.energySphere.setScale(4.5);
        if(color === "red"){
            player.energySphere.setTintFill(0xff0000);
        }
        else{
            player.energySphere.setTintFill(0x0000ff)
        }
    }
    else{
        player.energySphere.setPosition(center.x, center.y).refreshBody();
    }
}

function onPlayerAction(scene){
    if (cursors.up.isDown)
    {
        var playerCenter = rightPlayer.getCenter();
        var ballCenter = ball.getCenter();
        rightPlayer.setVelocityY(-550);
        if(Phaser.Math.Distance.Between(playerCenter.x, playerCenter.y, ballCenter.x, ballCenter.y) <= (rightPlayer.width/2 + ball.width/2) + 2 && rightPlayer.body.blocked.down ){
            ball.setVelocityY(-550);
        }
    }
    if (cursors.down.isDown)
    {
        rightPlayer.setVelocityY(400);
    }
    if(cursors.left.isDown && !cursors.up.isDown){
        if(rightPlayer.body.blocked.down){
            rightDashing = true;
            rightPlayer.setVelocityX(-1000);
            scene.time.addEvent({
                delay:200,
                callback: () => {
                    rightDashing = false;
                }
            })
        }
    }
    if(cursors.right.isDown && !cursors.up.isDown){
        if(rightPlayer.body.blocked.down){
            rightDashing = true;
            rightPlayer.setVelocityX(1000);
            scene.time.addEvent({
                delay:200,
                callback: () => {
                    rightDashing = false;
                }
            })
        }
    }
    if (S.isDown)
    {
        leftPlayer.setVelocityY(400);
    }
    if (W.isDown)
    {
        var playerCenter = leftPlayer.getCenter();
        var ballCenter = ball.getCenter();
        leftPlayer.setVelocityY(-550);
        if(Phaser.Math.Distance.Between(playerCenter.x, playerCenter.y, ballCenter.x, ballCenter.y) <= (leftPlayer.width/2 + ball.width/2) + 2 && leftPlayer.body.blocked.down ){
            ball.setVelocityY(-550);
        }
    }
    if(A.isDown && !W.isDown){
        if(leftPlayer.body.blocked.down){
            leftDashing = true;
            leftPlayer.setVelocityX(-1000);
            scene.time.addEvent({
                delay:200,
                callback: () => {
                    leftDashing = false;
                }
            })
        }
    }
    if(D.isDown && !W.isDown){
        if(leftPlayer.body.blocked.down){
            leftDashing = true;
            leftPlayer.setVelocityX(1000);
            scene.time.addEvent({
                delay:200,
                callback: () => {
                    leftDashing = false;
                }
            })
        }
    }
}

function update ()
{
    if (gameOver)
    {
        return;
    }
    if(!rightDashing){
        if (cursors.left.isDown)
        {
            rightPlayer.setVelocityX(-330);

            rightPlayer.anims.play('left', true);
        }
        else if (cursors.right.isDown)
        {
            rightPlayer.setVelocityX(330);

            rightPlayer.anims.play('right', true);
        }
        else
        {
            rightPlayer.setVelocityX(0);
            rightPlayer.anims.play('turn');
        }
    }
    if(!leftDashing){
        if (A.isDown)
        {
            leftPlayer.setVelocityX(-330);
            leftPlayer.anims.play('left', true);
        }
        else if (D.isDown)
        {
            leftPlayer.setVelocityX(330);

            leftPlayer.anims.play('right', true);
        }
        else
        {
            leftPlayer.setVelocityX(0);
            leftPlayer.anims.play('turn');
        }
    }
    this.physics.world.wrap(leftPlayer);
    this.physics.world.wrap(rightPlayer);
    this.physics.world.wrap(ball);
}
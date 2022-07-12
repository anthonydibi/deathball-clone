

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

    //  Here we create the ground.
    //  Scale it to fit the width of the game (the original sprite is 400x32 in size)

    //  Now let's create some ledges

    // The player and its settings
    leftPlayer = this.physics.add.sprite(100, 450, 'dude');
    rightPlayer = this.physics.add.sprite(100, 450, 'dude');
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

    ball.setBounce(.4, .4);

    ball.setScale(.3);

    ball.setMass(.5);

    energySpheres = this.physics.add.staticGroup();

    this.physics.add.collider(balls, platforms);

    this.physics.add.collider(leftPlayer, balls);
    this.physics.add.collider(rightPlayer, balls);
    this.physics.add.collider(leftPlayer, rightPlayer);
    this.physics.add.collider(balls, energySpheres, ballCollidesEnergySphere);

    var leftPlayerAction = this.input.keyboard.addKey('CTRL');  // Get key object
    var rightPlayerAction = this.input.keyboard.addKey('X');
    leftPlayerAction.on('down', () => { onPlayerAction(leftPlayer); spawnEnergySphere(rightPlayer); });
    rightPlayerAction.on('down', () => { onPlayerAction(rightPlayer); spawnEnergySphere(leftPlayer); });
    this.tweens.timeScale = 2; // tweens
    this.physics.world.timeScale = 2; // physics
    this.time.timeScale = 2;
}

function ballCollidesEnergySphere(ball, sphere){ //some yucky linear algebra, just gets a vector from bounce sphere to ball, puts the ball at the edge of the sphere and then sets the velocity of the ball to the bounce sphere->ball vector + a bit of the incoming velocity
    let incomingSpeed = ball.body.velocity;
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
    bounceVector.scale(400);
    bounceVector.x += incomingSpeed.x / 3;
    bounceVector.y += incomingSpeed.y / 3;
    ball.setVelocity(bounceVector.x, bounceVector.y);
}

function spawnEnergySphere(player){
    if(player.body.blocked.down){
        return;
    }
    let center = player.getCenter();
    if(!player.energySphere){
        player.energySphere = energySpheres.create(center.x, center.y, "energysphere");
        player.energySphere.body.setCircle(player.energySphere.width/2);
        player.energySphere.setScale(4.5);
    }
    else{
        player.energySphere.setPosition(center.x, center.y).refreshBody();
    }
}

function onPlayerAction(){
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
}

function update ()
{
    if (gameOver)
    {
        return;
    }

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

    this.physics.world.wrap(leftPlayer);
    this.physics.world.wrap(rightPlayer);
    this.physics.world.wrap(ball);
}
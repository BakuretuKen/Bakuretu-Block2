/**
 * 爆裂ブロック 重ね着バージョン JavaScript版 ver2.05
 * https://bakuretuken.com/block/
 */

if (typeof BLOCK_GAME_SCREEN == 'undefined') {
    var BLOCK_GAME_SCREEN = 1;
}
if (typeof BLOCK_GAME_LIFE == 'undefined') {
    var BLOCK_GAME_LIFE = 3;
}
if (typeof BLOCK_GAME_MIN_BLOCK_PIXEL == 'undefined') {
    if (BLOCK_GAME_BLOCK_SIZE == 32) {
        var BLOCK_GAME_MIN_BLOCK_PIXEL = 24;
    } else {
        var BLOCK_GAME_MIN_BLOCK_PIXEL = 6;
    }
}
// console.log("BLOCK_GAME_MIN_BLOCK_PIXEL: "+BLOCK_GAME_MIN_BLOCK_PIXEL);

if (BLOCK_GAME_WIDTH % BLOCK_GAME_BLOCK_SIZE != 0) {
    alert("BLOCK_GAME_WIDTH is not a multiple of BLOCK_GAME_BLOCK_SIZE");
}
if (BLOCK_GAME_HEIGHT % BLOCK_GAME_BLOCK_SIZE != 0) {
    alert("BLOCK_GAME_HEIGHT is not a multiple of BLOCK_GAME_BLOCK_SIZE");
}

enchant();
var game = new Game(BLOCK_GAME_WIDTH, BLOCK_GAME_HEIGHT);
game.preload("block_image_front1.png", "block_image_back.jpg", "block_image_win.jpg", "block_icon_menu.png", "block_icon_boll.png", "block_icon_panel.png", "block_icon_life.png");
if (BLOCK_GAME_SCREEN == 2) {
    game.preload("block_image_front2.png");
}
game.fps = BLOCK_GAME_FPS;
game.mode = 0; // WAIT FIRST START
game.lives = BLOCK_GAME_LIFE; // 残機数

var scene = new Scene();
var imgFront1 = new Image();
var imgFront2 = new Image();
var imgBack = new Image();
var imgWin = new Image();
var sf = new Surface(BLOCK_GAME_WIDTH, BLOCK_GAME_HEIGHT);

var touchPos = -1;

var blockBaseNum = 0;
var blockBaseNumMaster = 0;

var blockBase = new Array(BLOCK_GAME_WIDTH / BLOCK_GAME_BLOCK_SIZE);
for (var k = 0; k < blockBase.length; k++) blockBase[k] = new Array(BLOCK_GAME_HEIGHT / BLOCK_GAME_BLOCK_SIZE);
var blockBaseMaster = new Array(BLOCK_GAME_WIDTH / BLOCK_GAME_BLOCK_SIZE);
for (var k = 0; k < blockBaseMaster.length; k++) blockBaseMaster[k] = new Array(BLOCK_GAME_HEIGHT / BLOCK_GAME_BLOCK_SIZE);

// --- ラベル Sprite
StartLabelSprite = Class.create(Sprite,
{
    initialize:function()
    {
        Sprite.call(this, 512, 128);
        this.image = game.assets["block_icon_menu.png"];
        this.init();
    },
    init:function()
    {
        this.frame = 0;
        this.x = (BLOCK_GAME_WIDTH/2) - (this.width/2);
        this.y = (BLOCK_GAME_HEIGHT/2) - (this.height/2);
    },
    ontouchstart:function(e)
    {
        if (game.mode == 0) gameStart();
        if (game.mode == 9 || game.mode == 10) gameRestart();
        if (game.mode == 11) gameContinue(); // 残機がある場合の継続
    }
});

// --- ゲーム画面 Sprite
SpriteScreen = Class.create(Sprite,
{
    initialize:function()
    {
        Sprite.call(this, BLOCK_GAME_WIDTH, BLOCK_GAME_HEIGHT);
    },
    // スマホの反射板移動
    ontouchstart:function(e)
    {
        touchPos = e.x;
    },
    ontouchend:function(e)
    {
        touchPos = -1;
    },
    ontouchmove:function(e)
    {
        if (touchPos == -1) return;
        var posDiff = e.x - touchPos;
        touchPos = e.x;
        game.bar.x = game.bar.x + posDiff;
        // 反射板の移動範囲を制限
        if (game.bar.x < -game.bar.width/2) game.bar.x = -game.bar.width/2;
        if (game.bar.x > BLOCK_GAME_WIDTH - game.bar.width/2) game.bar.x = BLOCK_GAME_WIDTH - game.bar.width/2;

        if (game.mode == 0 || game.mode == 11) { game.bomb.ox = game.bar.x +  (120 / 2); game.bomb.x = game.bomb.ox -10; }
    }
});

// --- ボール Sprite
Bomb = Class.create(Sprite,
{
    initialize:function()
    {
        Sprite.call(this, 22, 22);
        this.image = game.assets["block_icon_boll.png"];
        this.init();
    },
    init:function()
    {
        this.frame = 0;
        this.ox = (120 / 2) + 10;
        this.oy = BLOCK_GAME_HEIGHT - BLOCK_BAR_MARGIN_BOTTOM - 20;
        this.x = this.ox -10;
        this.y = this.oy - 10;
        this.vy = 0;
        this.vx = 0;
    },
    onenterframe:function()
    {
        if (game.mode != 1 && game.mode != 2) return;

        if (this.move()) {
            this.ox = this.ox + this.vx;
            this.oy = this.oy + this.vy;

            this.x = this.ox -10;
            this.y = this.oy - 10;
        }
    },
    move:function()
    {
        var rtnFlag = true;
        if (game.bar.time > 0) game.bar.time--;
        if (game.bar.time == 0) game.bar.frame = 0;

        if (this.ox < 10) {
            this.ox = 10;
            this.vx = -this.vx;
            rtnFlag = false;
        }
        if (this.ox > BLOCK_GAME_WIDTH - 10) {
            this.ox = BLOCK_GAME_WIDTH - 10;
            this.vx = -this.vx;
            rtnFlag = false;
        }
        if (this.oy < 10) {
            this.oy = 10;
            this.vy = -this.vy;
            rtnFlag = false;
        }

        // Bar Hit
        if (this.intersect(game.bar)) {
            this.vy = -this.vy;
            game.bomb.frame = 0;
            game.bar.frame = 1;
            game.bar.time = 3;
            this.oy = BLOCK_GAME_HEIGHT - BLOCK_BAR_MARGIN_BOTTOM - 12;
            // バーの左側（30px以内）に当たった場合
            if (this.ox < game.bar.x + 30) {
                // 左側に反射させる
                this.vx = -Math.abs(BLOCK_GAME_BALL_SPEED + 3);
                this.vy = -Math.abs(BLOCK_GAME_BALL_SPEED - 3);
            }
            // バーの右側（90px以降）に当たった場合
            else if (this.ox > game.bar.x + 90) {
                // 右側に反射させる
                this.vx = Math.abs(BLOCK_GAME_BALL_SPEED + 3);
                this.vy = -Math.abs(BLOCK_GAME_BALL_SPEED - 3);
            }
            // バーの中央（58-62px）に当たった場合
            else if (this.ox >= game.bar.x + 58 && this.ox <= game.bar.x + 62) {
                game.bomb.frame = 1;
                // 真上に反射
                this.vx = (this.vx > 0) ? BLOCK_GAME_BALL_SPEED : -BLOCK_GAME_BALL_SPEED;
                this.vy = -BLOCK_GAME_BALL_SPEED;
            }
            // バーの中央付近（30-90px）に当たった場合
            else {
                // 通常の反射
                this.vx = (this.vx > 0) ? BLOCK_GAME_BALL_SPEED : -BLOCK_GAME_BALL_SPEED;
                this.vy = -BLOCK_GAME_BALL_SPEED;
            }
        }

        if (this.oy > BLOCK_GAME_HEIGHT - 10) {
            loseLife();
            return false;
        }

        var maxX = BLOCK_GAME_WIDTH / BLOCK_GAME_BLOCK_SIZE;
        var maxY = BLOCK_GAME_HEIGHT / BLOCK_GAME_BLOCK_SIZE;

        // X方向のブロック衝突判定
        var posX = parseInt((this.ox + this.vx) / BLOCK_GAME_BLOCK_SIZE);
        var posY = parseInt(this.oy / BLOCK_GAME_BLOCK_SIZE);

        if (posX >= 0 && posX < maxX && posY >= 0 && posY < maxY) {
            if (blockBase[posX][posY] === 1) {
                blockBase[posX][posY] = 0;
                blockBaseNum--;
                // console.log("[BakuretuBlock] Block: "+blockBaseNum);
                drawBackImage(posX, posY);
                if (blockBaseNum == 0 && game.mode == 1) { gameNextStage(); return false; }
                if (blockBaseNum == 0 && game.mode == 2) { gameWin(); return false; }
                if (game.bomb.frame == 0) {
                    this.vx = -this.vx;
                    rtnFlag = false;
                }
            }
            // ブロック化しないが画素がある場合、ブロック画像を削除
            if (blockBase[posX][posY] === 2) {
                blockBase[posX][posY] = 0;
                drawBackImage(posX, posY);
            }
        }

        // Y方向のブロック衝突判定
        posX = parseInt(this.ox / BLOCK_GAME_BLOCK_SIZE);
        posY = parseInt((this.oy + this.vy) / BLOCK_GAME_BLOCK_SIZE);

        if (posX >= 0 && posX < maxX && posY >= 0 && posY < maxY) {
            if (blockBase[posX][posY] === 1) {
                blockBase[posX][posY] = 0;
                blockBaseNum--;
                // console.log("[BakuretuBlock] Block: "+blockBaseNum);
                drawBackImage(posX, posY);
                if (blockBaseNum == 0 && game.mode == 1) { gameNextStage(); return false; }
                if (blockBaseNum == 0 && game.mode == 2) { gameWin(); return false; }
                if (game.bomb.frame == 0) {
                    this.vy = -this.vy;
                    rtnFlag = false;
                }
            }
            // ブロック化しないが画素がある場合、ブロック画像を削除
            if (blockBase[posX][posY] === 2) {
                blockBase[posX][posY] = 0;
                drawBackImage(posX, posY);
            }
        }

        return rtnFlag;
    }
});

// --- PanelBar Sprite
PanelBar = Class.create(Sprite,
{
    initialize:function()
    {
        Sprite.call(this, 120, 16);
        this.image = game.assets["block_icon_panel.png"];
        this.init();
    },
    init:function()
    {
        this.x = 10;
        this.y = BLOCK_GAME_HEIGHT - BLOCK_BAR_MARGIN_BOTTOM;
        this.time = 0;
    }
});

// --- LifeDisplay Sprite（残機表示）
LifeDisplay = Class.create(Sprite,
{
    initialize:function()
    {
        Sprite.call(this, 200, 30);
        this.surface = new Surface(200, 30);
        this.image = this.surface;
        this.init();
    },
    init:function()
    {
        this.x = 10;
        this.y = 10;
        this.updateDisplay();
    },
    updateDisplay:function()
    {
        // 画面をクリア
        var ctx = this.surface.context;
        ctx.clearRect(0, 0, this.width, this.height);

        // 残機数分のハートマークを描画
        var heartImage = game.assets["block_icon_life.png"];
        if (heartImage && heartImage._element) {
            for (var i = 0; i < game.lives - 1; i++) {
                ctx.drawImage(heartImage._element, i * 35, 0, 30, 30);
            }
        }
    }
});

// --- main
window.onload = function()
{
    game.onload = function()
    {
    imgFront1 = game.assets["block_image_front1.png"]._element;
    if (BLOCK_GAME_SCREEN == 2) {
        imgFront2 = game.assets["block_image_front2.png"]._element;
    } else {
        imgFront2 = null;
    }
    imgBack = game.assets["block_image_back.jpg"]._element;
    imgWin = game.assets["block_image_win.jpg"]._element;

    // ゲームスタート・リスタート ボタン
    game.restart = new StartLabelSprite();

    game.bomb = new Bomb();
    game.bar = new PanelBar();
    game.lifeDisplay = new LifeDisplay();
    game.spriteScreen = new SpriteScreen();

    // for PC Mouse
    // PCの反射板移動
    document.getElementById("enchant-stage").addEventListener("mousemove", function(e)
    {
        var debug = e.pageX - this.getBoundingClientRect().left - (game.bar.width / 2);
        game.bar.x = e.pageX - this.getBoundingClientRect().left - (game.bar.width / 2);

        // 反射板の移動範囲を制限
        if (game.bar.x < -game.bar.width/2) game.bar.x = -game.bar.width/2;
        if (game.bar.x > BLOCK_GAME_WIDTH - game.bar.width/2) game.bar.x = BLOCK_GAME_WIDTH - game.bar.width/2;

        if (game.mode == 0 || game.mode == 11) { game.bomb.ox = game.bar.x +  (120 / 2); game.bomb.x = game.bomb.ox -10; }
    }, false);
    document.getElementById("enchant-stage").addEventListener("click", function(e)
    {
        if (e.pageY < 150) return;
        if (game.mode == 0) gameStart();
        if (game.mode == 9) gameRestart();
        if (game.mode == 11) gameContinue(); // 残機がある場合の継続
    }, false);

    initGame(imgFront1);

    game.spriteScreen.image = sf;

    // 初回シーン実行
    scene.addChild(game.spriteScreen);
    scene.addChild(game.restart);
    scene.addChild(game.bar);
    scene.addChild(game.bomb);
    scene.addChild(game.lifeDisplay);
    game.replaceScene(scene);

    }; // End of game.onload

    game.start();
};

function initGame(targetImage)
{
    sf.context.clearRect(0, 0, sf.width, sf.height);
    sf.context.drawImage(targetImage, 0, 0);

    blockBaseNum = 0;
    blockBaseNumMaster = 0;
    for (var y = 0; y < BLOCK_GAME_HEIGHT / BLOCK_GAME_BLOCK_SIZE; y++) {
        for (var x = 0; x < BLOCK_GAME_WIDTH / BLOCK_GAME_BLOCK_SIZE; x++) {
            blockBase[x][y] = 0;
            blockBaseMaster[x][y] = 0;
            if (haveBlock(sf.context, x, y)) {
                var blockFlag = haveBlock(sf.context, x, y);
                blockBase[x][y] = blockFlag;
                blockBaseMaster[x][y] = blockFlag;
                if (blockFlag == 1) {
                    blockBaseNum++;
                    blockBaseNumMaster++;
                }
            }
        }
    }

    // console.log("[BakuretuBlock] Init Block: "+blockBaseNum);

    sf.context.drawImage(imgBack, 0, 0);
    if (targetImage == imgFront1 && imgFront2 != null) {
        sf.context.drawImage(imgFront2, 0, 0);
    }
    sf.context.drawImage(targetImage, 0, 0);
//    game.spriteScreen.image = sf;
};

function haveBlock(ctx, x, y)
{
    var num = 0, i = 0;
    var imageData = ctx.getImageData(x*BLOCK_GAME_BLOCK_SIZE, y*BLOCK_GAME_BLOCK_SIZE, BLOCK_GAME_BLOCK_SIZE, BLOCK_GAME_BLOCK_SIZE);
    for (i = 0; i < BLOCK_GAME_BLOCK_SIZE*BLOCK_GAME_BLOCK_SIZE; i++) {
      if (imageData.data[i*4+3]) num++;
    }
    if (num >= BLOCK_GAME_MIN_BLOCK_PIXEL) {
        return 1; // ブロック化
    }
    if (num > 0) {
        return 2; // ブロック化しないが画素がある
    }
    return 0; // ブロック化しない
};

function drawBackImage(x, y)
{
    var ctx = sf.context;
    var blockX = x * BLOCK_GAME_BLOCK_SIZE;
    var blockY = y * BLOCK_GAME_BLOCK_SIZE;

    // まず該当領域をクリア
    ctx.clearRect(blockX, blockY, BLOCK_GAME_BLOCK_SIZE, BLOCK_GAME_BLOCK_SIZE);

    // 背景画像を描画
    ctx.drawImage(imgBack, blockX, blockY, BLOCK_GAME_BLOCK_SIZE, BLOCK_GAME_BLOCK_SIZE, blockX, blockY, BLOCK_GAME_BLOCK_SIZE, BLOCK_GAME_BLOCK_SIZE);

    if (game.mode == 1 && imgFront2 != null) {
        // imgFront2を描画
        ctx.drawImage(imgFront2, blockX, blockY, BLOCK_GAME_BLOCK_SIZE, BLOCK_GAME_BLOCK_SIZE, blockX, blockY, BLOCK_GAME_BLOCK_SIZE, BLOCK_GAME_BLOCK_SIZE);
    }

    // Surface の変更を強制的に Sprite に通知
    game.spriteScreen.image = sf;
};

function gameStart()
{
    game.restart.y = -100; // HIDE
    // ボールに移動量
    game.bomb.vy = BLOCK_GAME_BALL_SPEED;
    game.bomb.vx = BLOCK_GAME_BALL_SPEED;
    game.mode = 1; // GAME NOW
};

function gameContinue()
{
    game.restart.y = -100; // HIDE
    // ボールに移動量
    game.bomb.vy = BLOCK_GAME_BALL_SPEED;
    game.bomb.vx = BLOCK_GAME_BALL_SPEED;
    game.mode = 1; // GAME NOW
};

function loseLife()
{
    game.lives--;
    game.lifeDisplay.updateDisplay();

    if (game.lives <= 0) {
        gameLose();
    } else {
        // 残機がある場合はボールをリセットして「START」表示
        game.bomb.init();
        // 反射板にボールを追従させる
        game.bomb.vx = 0;
        game.bomb.vy = 0;
        game.bomb.ox = game.bar.x + (120 / 2);
        game.bomb.x = game.bomb.ox -10;
        game.bomb.oy = BLOCK_GAME_HEIGHT - BLOCK_BAR_MARGIN_BOTTOM - 20;
        game.bomb.y = game.bomb.oy - 10;
        game.restart.x = (BLOCK_GAME_WIDTH/2) - (game.restart.width/2);
        game.restart.y = (BLOCK_GAME_HEIGHT/2) - (game.restart.height/2);
        game.restart.frame = 2; // 3フレーム目の「START」画像
        game.mode = 11; // GAME CONTINUE（継続待ち）
    }
};

function gameLose()
{
    game.restart.x = (BLOCK_GAME_WIDTH/2) - (game.restart.width/2);
    game.restart.y = (BLOCK_GAME_HEIGHT/2) - (game.restart.height/2) - 50;
    // game.restart.x = 0;
    // game.restart.y = 0;
    game.restart.frame = 1;

    // ボールに非表示＆移動量なし
    game.bomb.vy = 0;
    game.bomb.vx = 0;
    game.bomb.oy = -100;
    game.bomb.y = -100;

    game.mode = 9; // GAME LOSE
};

function gameWin()
{
    game.mode = 10; // GAME WIN

    // ボールに非表示＆移動量なし
    game.bomb.vy = 0;
    game.bomb.vx = 0;
    game.bomb.oy = -100;
    game.bomb.y = -100;

    // パネル非表示
    game.bar.y = -100;

    // 残機ハートマーク非表示
    game.lifeDisplay.y = -100;

    sf.context.drawImage(imgWin, 0, 0);
};

function gameNextStage()
{
    if (BLOCK_GAME_SCREEN == 2) {
        initGame(imgFront2);
        game.mode = 2; // GAME NEXT STAGE
    } else {
        gameWin(); // 次ステージなし(GAME WIN)
    }
};

function gameRestart()
{
    initGame(imgFront1);

    game.lives = BLOCK_GAME_LIFE; // 残機をリセット
    game.restart.init();
    game.bomb.init();
    game.bar.init();
    game.lifeDisplay.updateDisplay();

    // gameStart();
    game.mode = 0; // GAME START WAIT
};

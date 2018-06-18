const express = require('express');
const router = express.Router();
var io = require('../app.js').io;
//var mysql = require('mysql');
var crypto = require('crypto');
const { Pool } = require('pg');
var turn = -1;

/*
const pool = new Pool({
    connectionString: "postgres://127.0.0.1:5432/yunwoo",
    ssl: false
  });
*/  

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

/*
var pool  = mysql.createPool({
    connectionLimit : 10,
    host            : 'localhost',
    user            : 'root',
    password        : '****',
    database        : 'catdogwar'
});
*/

function sessionCheck(req){
    if(!req.session.email || req.session.email == "cat@cat.com" || req.session.email == "dog@dog.com"){
        return false;
    }else{
        return true; 
    }
}

router.get('/',(req,res,next)=>{
    if(sessionCheck(req)){
        var cntxt = {'email':req.session.email,
            "races":req.session.races};
        res.redirect("/game/"+cntxt.races);
    }else{
        req.session.destroy();
        res.render('index');
    }
})


router.get('/myresult',(req,res,next)=>{
    res.send('end game');
})

router.post('/scoreAdd',async (req,res,next)=>{
    console.log("score add");
    var useremail = "" ;
    if(!req.session.email){
        console.log('no user info');
    }else{
        useremail = req.session.email.toString();
    }
    var dogScore = parseInt(req.body.DogScore);
    var catScore = parseInt(req.body.CatScore);
    io.emit('updateTotScore', { 'cat':catScore ,'dog':dogScore });
    var dogZero = dogScore == 0;
    var catZero = catScore == 0;
    var usrScore = 0;
    if(req.session.races == 'dog')
        usrScore = dogScore;
    else
        usrScore = catScore;
    var sqlcat = "update Races set coin=coin+($1) where races='cat'";
    var sqldog = "update Races set coin=coin+($1) where races='dog'";
    var sqlusr = "update Player set coin=coin+($1) where email=($2)";
    try{
        const conn = await pool.connect();
        await conn.query(sqlusr,[usrScore,useremail]);
        //if(result.affectedRows== 0){console.log('user score input fail');};
        if(dogZero){
            // catScore only
            await conn.query(sqlcat,[catScore]);
            conn.release();
            res.send('');
        }else if(catZero){
            // dogScore only
            await conn.query(sqldog,[dogScore]);
            conn.release();
            res.send('');
        }else{
            // bothScore
            await conn.query(sqlcat,[catScore])
            await conn.query(sqldog,[dogScore])
            conn.release();
            res.send('');
        
        } 
    }catch(err){
        console.error(err);
        res.send("Error"+err);
    }
    /*
    pool.getConnection((err,conn)=>{
        if(err){console.log(err);res.send(err);return;};
        conn.query(sqlusr,[usrScore,useremail],(err,result)=>{
            if(err){console.log(err);};
            if(result.affectedRows== 0){console.log('user score input fail');};
            if(dogZero){
                // catScore only
                conn.query(sqlcat,[catScore],(err,result)=>{
                    if(err){console.log(err);res.send(err);return;};
                    if(result.affectedRows== 0){res.send('fail');};
                    conn.release();
                    res.send('');
                });
            }else if(catZero){
                // dogScore only
                conn.query(sqldog,[dogScore],(err,result)=>{
                    if(err){console.log(err);res.send(err);return;};
                    if(result.affectedRows== 0){res.send('fail');};
                    conn.release();
                    res.send('');
                });

            }else{
                // bothScore
                conn.query(sqlcat,[catScore],(err,result)=>{
                    if(err){console.log(err);res.send(err);return;};
                    if(result.affectedRows== 0){res.send('fail');};
                    conn.query(sqldog,[dogScore],(err,result)=>{
                        if(err){console.log(err);res.send(err);return;};
                        if(result.affectedRows== 0){res.send('fail');};
                        conn.release();
                        res.send('');
                    });
                });
            }
        });
    });
    */
});

router.post('/scoreAdd_Avengers',async (req,res,next)=>{
    console.log("score add avengers");
    var useremail = "" ;
    if(!req.session.email){
        console.log('no user info');
    }else{
        useremail = req.session.email.toString();
    }
    var AvengersScore = parseInt(req.body.AvengersScore);
    var ThanosScore = parseInt(req.body.ThanosScore);
    io.emit('updateTotScore2', { 'AvengersScore':AvengersScore ,'ThanosScore':ThanosScore });
    var AvengersZero = AvengersScore == 0;
    var ThanosZero = ThanosScore == 0;
    var usrScore = AvengersScore;
    
    var sqlcat = "update Races set coin=coin+($1) where races='cat'";
    var sqldog = "update Races set coin=coin+($1) where races='dog'";
    var sqlthanos = "update Races set coin=coin+($1) where races='thanos'";
    var sqlusr = "update Player set coin=coin+($1) where email=($2)";
    try{
        const conn = await pool.connect();
        await conn.query(sqlusr,[usrScore,useremail]);
        //if(result.affectedRows== 0){console.log('user score input fail');};
        if(AvengersZero){
            // catScore only
            await conn.query(sqlthanos,[ThanosScore]);
            conn.release();
            res.send('');
        }else if(ThanosZero){
            // dogScore only
            if(AvengersScore%2 == 0){
                await conn.query(sqldog,[AvengersScore/2]);
                await conn.query(sqlcat,[AvengersScore/2]);
            }else{
                var temp = AvengersScore + 1;
                var temp2 = AvengersScore - 1;
                if (turn == -1){
                    await conn.query(sqldog,[temp/2]);
                    await conn.query(sqlcat,[temp2/2]);
                }else{
                    await conn.query(sqldog,[temp2/2]);
                    await conn.query(sqlcat,[temp/2]);
                }
                turn *= -1;
            }
            conn.release();
            res.send('');
        }else{
            if(AvengersScore%2 == 0){
                await conn.query(sqldog,[AvengersScore/2]);
                await conn.query(sqlcat,[AvengersScore/2]);
            }else{
                var temp = AvengersScore + 1;
                var temp2 = AvengersScore - 1;
                if (turn == -1){
                    await conn.query(sqldog,[temp/2]);
                    await conn.query(sqlcat,[temp2/2]);
                }else{
                    await conn.query(sqldog,[temp2/2]);
                    await conn.query(sqlcat,[temp/2]);
                }
                turn *= -1;
            }
            await conn.query(sqlthanos,[ThanosScore])
            conn.release();
            res.send('');
        } 
    }catch(err){
        console.error(err);
        res.send("Error"+err);
    }
});

router.post('/gameresult',async (req,res,next)=>{
    if(!req.session.email)
        res.send('invalid access');
    else{
        console.log("add result");
        var win = parseInt(req.body.win);
        var tie = parseInt(req.body.tie);
        var lose = parseInt(req.body.lose);
        var stage = parseInt(req.body.stage);
        var useremail = req.session.email.toString();
        var sql = "with sg1 as  (select stage from player where email=($1))\
                    update player\
                        set win=win+($2),tie=tie+($3),lose=lose+($4),\
                            stage = (CASE \
                                        WHEN sg1.stage < ($5) THEN ($6) \
                                        ELSE sg1.stage \
                                    END) \
                    from sg1 where player.email=($7)";
        try{
            const conn = await pool.connect();
            await conn.query(sql,[useremail,win,tie,lose,stage,stage,useremail]);
            conn.release();
            res.redirect('/');
        }catch(err){
            console.error(err);
            res.send("Error"+err);
        }
    }
    /*
    pool.getConnection((err,conn)=>{
        if(err){console.log(err);res.send(err);return;};
        conn.query(sql,[win,tie,lose,useremail],(err,result)=>{
            if(err){console.log(err);res.send(err);return;};
            if(result.affectedRows== 0){res.send('fail');};
            conn.release();
            res.redirect('/');
        });
    });
    */
});

router.get('/demogame/:races', async (req,res,next)=>{
    var sqlraces = "select * from Races where not races='thanos'";
    var racesObj ={};
    req.session.races = req.params.races;
    try{
        const conn = await pool.connect();
        const {rows} = await conn.query(sqlraces);
        if(rows.length == 0){res.send('no id or match');};
        conn.release();
        for(let idx = 0 ; idx < rows.length;idx++){
            racesObj[rows[idx].races]=rows[idx].coin;
        }
        var context = { 'racesInfo':racesObj,'races':req.params.races};
        context['session'] = sessionCheck(req);
        console.log(context);
        res.render('demogame',context);

    }catch (err){
        console.error(err);
        res.send("Error"+err);
    }
    /*
    var sqlraces = 'select * from Races';
    var racesObj ={};
    pool.getConnection((err,conn)=>{
        if(err){console.log(err);res.send(err);return;};
        conn.query(sqlraces,(err,rows)=>{
            if(err){console.log(err);res.send(err);return;};
            if(rows.length == 0){res.send('no id or match');};
            conn.release();
            for(let idx = 0 ; idx < rows.length;idx++){
                racesObj[rows[idx].races]=rows[idx].coin;
            }
            var context = { 'racesInfo':racesObj};
            console.log(context);
            res.render('demogame',context);
        });
    })
    */

})

router.get('/game/:races', async (req,res,next)=>{
    if(!req.session.email)
        res.send('Log in please');
    var sqlusr = 'select * from Player where email=($1)';
    var usrInfo ={};
    var sqlraces = "select * from Races where not races='thanos'";
    var racesObj ={};
    try{
        const conn = await pool.connect();
        var {rows} = await conn.query(sqlusr,[req.session.email]);
        if(rows.length == 0){res.send('no id or match');};
        usrInfo.email =rows[0].email;
        usrInfo.nick =rows[0].nick;
        usrInfo.win =rows[0].win;
        usrInfo.lose =rows[0].lose;
        usrInfo.tie =rows[0].tie;
        usrInfo.coin =rows[0].coin;

        var {rows} = await conn.query(sqlraces);
        conn.release();
        for(let idx = 0 ; idx < rows.length;idx++){
            racesObj[rows[idx].races]=rows[idx].coin;
        }
        var context = {'usrInfo':usrInfo, 'racesInfo':racesObj,'races':req.params.races};
        context['session'] = sessionCheck(req);
        console.log(context);
        res.render('game',context);

    }catch (err){
        console.error(err);
        res.send("Error"+err);
    }
    /*
    pool.getConnection((err,conn)=>{
        if(err){console.log(err);res.send(err);return;};
        conn.query(sqlusr,[req.session.email],(err,rows)=>{
            if(err){console.log(err);res.send(err);return;};
            if(rows.Length == 0){res.send('no id or match');};
            console.log(rows[0]);
            usrObj.email =rows[0].email;
            usrObj.nick =rows[0].nick;
            usrObj.win =rows[0].win;
            usrObj.lose =rows[0].lose;
            usrObj.tie =rows[0].tie;
            usrObj.coin =rows[0].coin;
            conn.query(sqlraces,(err,rows)=>{
                if(err){console.log(err);res.send(err);return;};
                if(rows.length == 0){res.send('no id or match');};
                conn.release();
                for(let idx = 0 ; idx < rows.length;idx++){
                    racesObj[rows[idx].races]=rows[idx].coin;
                }
                var context = {'usrInfo':usrObj,
                    'racesInfo':racesObj};
                console.log(context);
                res.render('game',context);
            });
        });
    })
    */

})

router.get('/InfinityWar/:races', async (req,res,next)=>{
    if(!req.session.email){
        var email = req.params.races + "@" + req.params.races + ".com";
        req.session.email = email;
        req.session.races = req.params.races;
    }else{
        var email = req.session.email;
    }
    console.log(email);
    var sqlusr = 'select * from Player where email=($1)';
    var usrInfo ={};
    var sqlInfinityWar = "select  case when races='thanos' then 'thanos' else 'avengers' end as races,sum(coin) as coin from races group by case when races='thanos' then 'thanos' else 'avengers' end";
    var racesObj ={};
    try{
        const conn = await pool.connect();
        var {rows} = await conn.query(sqlusr,[email]);
        if(rows.length == 0){res.send('no id or match');};
        usrInfo.email =rows[0].email;
        usrInfo.nick =rows[0].nick;
        usrInfo.win =rows[0].win;
        usrInfo.lose =rows[0].lose;
        usrInfo.tie =rows[0].tie;
        usrInfo.coin =rows[0].coin;
        usrInfo.races =rows[0].races;

        var {rows} = await conn.query(sqlInfinityWar);
        for(let idx = 0 ; idx < rows.length;idx++){
            racesObj[rows[idx].races]=rows[idx].coin;
        }

        conn.release();

        var context = {'usrInfo':usrInfo, 'racesInfo':racesObj,'races':req.params.races};
        context['session'] = sessionCheck(req);
        res.render('InfinityWar',context);

    }catch (err){
        console.error(err);
        res.send("Error"+err);
    }
})


router.post('/',async (req,res,next)=>{
    console.log("main page");
    var email = req.body.email; //"asdfasdf@nasdfas.com";
    var pwd = req.body.pw;
    var pwdre = req.body.pw_re;
    if(pwdre==""){
        console.log("sign in")
        var sql = "select * from Player where email=($1)";
        var arr = [email];
        try{
            const conn = await pool.connect();
            const {rows} = await conn.query(sql,arr);
            if(rows.length == 0){res.send('there is no user '+email);};
            var salt = rows[0].salt;
            var pwdHash = rows[0].pwd;
            var userHashPass = crypto.createHash("sha512").update(pwd+salt).digest("hex");
            conn.release();
            if(userHashPass === pwdHash){
                req.session.email = rows[0].email;
                req.session.races = rows[0].races;
                res.redirect('/');    
            }else{
                res.send('wrong passward');
            }  
            
            
        }catch (err){
            console.error(err);
            res.send("Error"+err);
        }
        /*
        pool.getConnection((err,conn)=>{
            if(err){console.log(err);res.send(err);return;};
            conn.query(sql,arr,(err,rows)=>{
                if(err){console.log(err);res.send(err);return;};
                if(rows.length == 0){res.send('no email or password does not match');return;};
                req.session.email = rows[0].email;
                req.session.races = rows[0].races;
                console.log(rows);
                conn.release();
                res.redirect('/');
            });
        })
        */
    }else{
        console.log("sign up");
        var nick = req.body.nick;
        var races = req.body.races;
        var sql = "insert into Player(email,nick,pwd,regdate,win,tie,lose,coin,races,salt) values(($1),($2),($3),now(),0,0,0,0,($4),($5))";
        var salt = Math.round((new Date().valueOf() * Math.random()))+"";
        var pwdHash = crypto.createHash('sha512').update(pwd+salt).digest('hex');
        var arr = [email,nick,pwdHash,races,salt];
        var sqlcheck = 'select * from Player where email=($1)';
        try{
            const conn = await pool.connect();
            var {rows} = await conn.query(sqlcheck,[email]);
            if(rows.length != 0){
                conn.release();
                res.send('email is already registered');
            }else{
                await conn.query(sql,arr);
                req.session.email = email;
                req.session.races = races; 
                conn.release();
                res.redirect('/');
            }
        }catch (err){
            console.error(err);
            res.send("Error"+err);
        }
        /*
        pool.getConnection((err,conn)=>{
            if(err){console.log(err);res.send(err);return;};
            conn.query(sqlcheck,[email],(err,rows)=>{
                if(err){console.log(err);res.send(err);return;};
                if(rows.length != 0){conn.release();res.send('email is already registered');return;};
                conn.query(sql,arr,(err,result)=>{
                    if(err){console.log(err);return;};
                    req.session.email = email;
                    req.session.races = races;
                    conn.release();
                    res.redirect('/');
                })
            });
        })
        */
    }

});

router.get('/rank',async (req,res,next)=>{
    var sql = "SELECT substring(email from 1 for position('@' in email) -LEAST(length(substring(email from 1 for position('@' in email)-1)),3)) || '@xxx.x' as email,nick,win,lose,tie,coin,stage  from player order by stage DESC, win DESC, coin DESC;"
    try{
        const conn = await pool.connect();
        var {rows} = await conn.query(sql);
        conn.release();
        var context = {"rank":rows,'races':req.session.races};
        context['session'] = sessionCheck(req);
        res.render("rank",context)
    }catch (err){
        console.error(err);
        res.send("Error" + err);

    }


})

router.post('/logout',(req,res,next)=>{
    req.session.destroy();
    res.redirect('/');
})
module.exports = router;

const express = require('express');
const router = express.Router();
var io = require('../app.js').io;
var mysql = require('mysql');
const { Pool } = require('pg');
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
router.get('/',(req,res,next)=>{
    if(req.session.email){
        var cntxt = {'email':req.session.email,
            "races":req.session.races};
        res.redirect("/game/"+cntxt.races);
    }else{
        res.render('index');
    }
})

router.get('/myresult',(req,res,next)=>{
    res.send('end game');
})

router.post('/scoreAdd',async (req,res,next)=>{
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
    var sqlcat = "update Races set coin=coin+($1) where races ='cat'";
    var sqldog = "update Races set coin=coin+($1) where races ='dog'";
    var sqlusr = "update Player set coin=coin+($1) where email =($2)";
    try{
        const conn = await pool.connect();
        await conn.query(sqlusr,[usrScore,useremail]);
        //if(result.affectedRows== 0){console.log('user score input fail');};
        if(dogZero){
            // catScore only
            await conn.query(sqlcat,[catScore]);
            await conn.release();
            res.send('');
        }else if(catZero){
            // dogScore only
            await conn.query(sqldog,[dogScore]);
            await conn.release();
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

router.post('/gameresult',async (req,res,next)=>{
    if(!req.session.email)
        res.send('invalid access');return;
    var win = parseInt(req.body.win);
    var tie = parseInt(req.body.tie);
    var lose = parseInt(req.body.lose);
    var useremail = req.session.email.toString();
    var sql = "update Player set win=win+($1),tie=tie+($2),lose=lose+($3) where email=($4)";
    try{
        const conn = await pool.connect();
        await conn.query(sql);
        conn.release();
        res.redirect('/');

    }catch(err){
        console.error(err);
        res.send("Error"+err);
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
    var sqlraces = 'select * from Races';
    var racesObj ={};
    try{
        const conn = await pool.connect();
        const {rows} = await conn.query(sqlraces);
        if(rows.length == 0){res.send('no id or match');};
        conn.release();
        for(let idx = 0 ; idx < rows.length;idx++){
            racesObj[rows[idx].races]=rows[idx].coin;
        }
        var context = { 'racesInfo':racesObj};
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
        res.send('invalid access');
    var sqlusr = 'select * from Player where email=($1)';
    var usrInfo ={};
    var sqlraces = 'select * from Races';
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
        var context = {'usrInfo':usrInfo, 'racesInfo':racesObj};
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

router.post('/',async (req,res,next)=>{
    console.log("main page");
    var email = req.body.email; //"asdfasdf@nasdfas.com";
    var pwd = req.body.pw;
    var pwdre = req.body.pw_re;
    if(pwdre==""){
        console.log("sign in")
        var sql = "select * from Player where email=($1) and pwd=($2)";
        var arr = [email,pwd];
        try{
            const conn = await pool.connect();
            const {rows} = await conn.query(sql,arr);
            if(rows.length == 0){res.send('no email or password does not match');return;};
            req.session.email = rows[0].email;
            req.session.races = rows[0].races;
            console.log(rows);
            conn.release();
            res.redirect('/');
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
        var sql = "insert into Player(email,nick,pwd,regdate,win,tie,lose,coin,races) values(($1),($2),($3),now(),0,0,0,0,($4))";
        var arr = [email,nick,pwd,races];
        var sqlcheck = 'select * from Player where email=($1)';
        try{
            const conn = await pool.connect();
            var {rows} = await conn.query(sqlcheck,[email]);
            if(rows.length != 0){
                conn.release();
                res.send('email is already registered');
                return;
            };
            await conn.query(sql,arr);
            req.session.email = email;
            req.session.races = races; 
            conn.release();
            res.redirect('/');
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

router.post('/logout',(req,res,next)=>{
    req.session.destroy();
    res.redirect('/');
})
module.exports = router;

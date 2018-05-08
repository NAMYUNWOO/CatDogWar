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

router.post('/scoreAdd',(req,res,next)=>{
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
    var sqlcat = "update Races set coin=coin+? where races ='cat'";
    var sqldog = "update Races set coin=coin+? where races ='dog'";
    var sqlusr = "update Player set coin=coin+? where email =?";
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
});

router.post('/gameresult',(req,res,next)=>{
    if(!req.session.email)
        res.send('invalid access');return;
    var win = parseInt(req.body.win);
    var tie = parseInt(req.body.tie);
    var lose = parseInt(req.body.lose);
    var useremail = req.session.email.toString();
    var sql = "update Player set win=win+?,tie=tie+?,lose=lose+? where email =?";
    pool.getConnection((err,conn)=>{
        if(err){console.log(err);res.send(err);return;};
        conn.query(sql,[win,tie,lose,useremail],(err,result)=>{
            if(err){console.log(err);res.send(err);return;};
            if(result.affectedRows== 0){res.send('fail');};
            conn.release();
            res.redirect('/');
        });
    });
});

router.get('/demogame/:races', async (req,res,next)=>{
    var sqlraces = 'select * from Races';
    var racesObj ={};
    try{
        const client = await pool.connect();
        const rows = await client.query(sqlraces);
        if(rows.length == 0){res.send('no id or match');};
        client.release();
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

router.get('/game/:races',(req,res,next)=>{
    if(!req.session.email)
        res.send('invalid access');
    var sqlusr = 'select * from Player where email =?';
    var usrObj ={};
    var sqlraces = 'select * from Races';
    var racesObj ={};
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

})

router.post('/',(req,res,next)=>{
    var email = req.body.email;
    var pwd = req.body.pw;
    var pwdre = req.body.pw_re;
    if(pwdre==""){
        var sql = 'select * from Player where email =? and pwd =?';
        var arr = [email,pwd];
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
    }else{
        var nick = req.body.nick;
        var races = req.body.races;
        var sql = "insert into Player(email,nick,pwd,regdate,win,tie,lose,coin,races) values(?,?,?,now(),0,0,0,0,?)";
        var arr = [email,nick,pwd,races];
        var sqlcheck = 'select * from Player where email =?';
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
    }

});

router.post('/logout',(req,res,next)=>{
    req.session.destroy();
    res.redirect('/');
})
module.exports = router;

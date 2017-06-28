//GetMusic类

function MusicPlayer($container) {
    this.$container = $container;
    this.$channelsList = this.$container.find(".c-channels-list");//获取分类列表
    this.channelId = "";
    this.song = {};
    this.$audio = $("#music");//获取audio元素
    this.audio = this.$audio[0];
    this.$title = this.$container.find(".c-msg__title");//获取歌曲名
    this.$artist = this.$container.find(".c-msg__artist");//获取歌手名
    this.$channel = this.$container.find(".c-msg__channel");//获取频道信息
    this.channelName = "";
    this.poster = this.$container.find(".c-poster");//获取海报区域
    this.$posterImg = this.$container.find(".c-poster__img");//获取歌手头像
    this.sid = null;
    this.lyric = "";
    this.lyricTimeArr = [];
    this.$lyricList = this.$container.find(".c-lyric__list");//获取歌词内ul
    this.$lyric = this.$container.find(".c-lyric");//获取歌词外层div
    this.$playPause = this.$container.find(".c-control__play-pause");//暂停按钮
    this.$next = this.$container.find(".c-control__next");//下一首按钮
    // this.$posterImg = this.$container.find(".c-poster__img");
    this.$lyricBtn = this.$container.find(".c-setting__lyric");//歌词显示与关闭按钮
    this.$channelBtn = this.$container.find(".c-setting__channel");//频道显示与关闭按钮
    this.$curTime = this.$container.find(".c-progress__current-time");//当前音乐进度条时间
    this.$totalTime = this.$container.find(".c-progress__total-time");//音乐进度条总时长

    this.$curBar = this.$container.find(".c-progress__curbar");//进度条实时显示图标
    this.$baseBar = this.$container.find(".c-progress__basebar");//进度条实时显示外部div

    this.totalTime = "";
    this.curTime = "";

    this.volume = null;//音量
    this.$volumeBtn = this.$container.find(".c-setting__volume");//音量图标
    this.volume = this.audio.volume;
    this.$basicVolume = this.$container.find(".c-setting__basic-volume");//音量进度条
    this.$curVolume = this.$container.find(".c-setting__cur-volume");//实时音量

    this.firstLoad = true;

    this.init();
    this.bind();

}

MusicPlayer.prototype.init = function () {
    this.getChannels();//获取频道信息
    this.autoPlay();
    this.playStateChange();
}

MusicPlayer.prototype.bind = function () {
    this.changeLyric();
    this.playPause();
    this.nextSong();
    this.changeChannel();
    this.showLyric();
    this.showChannelsList();
    this.setTime();
    this.changeProgress();
    this.setMute();
    this.changeVolume();
    this.handleResize();
}

MusicPlayer.prototype.handleResize = function () {
    var _this = this;
    $(window).resize(function(){
        if(window.innerWidth>768){
            _this.poster.css("display","block")
        }else{
            if(_this.$lyricBtn.hasClass("c-setting__lyric--active")){
                _this.poster.css("display","none")
                //当文档宽度小于768且歌词显示按钮为激活状态时，隐藏头像及相关按钮
            }
        }
    })
}

MusicPlayer.prototype.getChannels = function () {
    var _this = this;
    this.$container.ready(function () {
      //jQuery的Ajax方法, 使用Promise接口关联到 .done()回调函数
        $.get('http://api.jirengu.com/fm/getChannels.php').done(function (data) {
            var channelsArr = JSON.parse(data).channels;
            for (var i = 0; i < channelsArr.length; i++) {
                var item = '<li data-channel_id=\"' + channelsArr[i].channel_id + '\" ' + 'data-channel_name=' + channelsArr[i].name + ' class=\"c-channels-list__item\">' + channelsArr[i].name + '</li>';
                _this.$channelsList.append(item);
            };
            $(".c-channels-list__item").first().addClass("c-channels-list__item--active");
            _this.channelId = channelsArr[0].channel_id;
            _this.channelName = channelsArr[0].name;
            _this.getSong();
        })
    });
}

MusicPlayer.prototype.getSong = function (str) {
    var _this = this;
    $.get('http://api.jirengu.com/fm/getSong.php', {
        channel: _this.channelId
    }).done(function (data) {
        // console.log(JSON.parse(data));
        _this.song = JSON.parse(data).song[0];
        // console.log(_this.song)
        _this.roadSong();
        if(_this.firstLoad){
            _this.firstLoad=false;
            return
        }else{
            _this.audio.play();
        } 
    });
}

MusicPlayer.prototype.roadSong = function () {
    this.audio.src = this.song.url;
    this.$title.text(this.song.title);
    this.$artist.text(this.song.artist);
    this.$channel.text("频道：" + this.channelName);
    this.$posterImg.css("background-image", "url(" + this.song.picture + ")");
    this.getLyric();
}

MusicPlayer.prototype.getLyric = function () {
    var _this = this;
    _this.sid = this.song.sid;
    $.post('http://api.jirengu.com/fm/getLyric.php', {
        sid: _this.sid
    }).done(function (data) {
        _this.lyric = JSON.parse(data).lyric;
        // console.log(_this.lyric)
        _this.loadLyric();
    });
}


MusicPlayer.prototype.loadLyric = function () {
    this.$lyricList.find("p").remove();
    this.lyricTimeArr = [];
    var lyricArr = this.lyric.split("\n");
    // console.log(lyricArr)
    for (var i = 0; i < lyricArr.length; i++) {
        var lyricText = lyricArr[i].slice(10) || "---";//有歌词的话去掉前面时间，没有的话显示---
        var lyricRow = '<p class=\"c-lyric__item' + i + '\">' + lyricText + '</p>';
        this.$lyricList.append(lyricRow);
        //获取歌词所在时间（单位：秒）：分*60+秒
        var lyricTime = Math.round(parseFloat(lyricArr[i].slice(1, 3)) * 60 + parseFloat(lyricArr[i].slice(4, 9)));
        this.lyricTimeArr.push(lyricTime);
    }

}

MusicPlayer.prototype.changeLyric = function () {
    var _this = this;
    this.$audio.on("timeupdate", function () {
        var time = Math.round(_this.audio.currentTime);
        for (var i = 0; i < _this.lyricTimeArr.length; i++) {
            if (time === _this.lyricTimeArr[i]) {
                $(".c-lyric__item" + i).siblings().removeClass("c-lyric__item--active");
                $(".c-lyric__item" + i).addClass("c-lyric__item--active");
                var top = 90 - i * 24;
                _this.$lyricList.animate({
                    top: top
                }, 400);
            }
        }
    });
}

MusicPlayer.prototype.playPause = function () {

    var _this = this;
    this.$playPause.on("click", function () {
        if (_this.audio.paused) {
            _this.audio.play();
        } else {
            _this.audio.pause();
        }
    });
}

MusicPlayer.prototype.playStateChange = function () {
    var _this = this;
    this.$audio.on('play',function () {
        _this.$playPause.removeClass("icon-play").addClass("icon-pause");
        _this.$posterImg.css("animation-play-state", "running");
    });
    this.$audio.on('pause',function () {
        _this.$playPause.removeClass("icon-pause").addClass("icon-play");
        _this.$posterImg.css("animation-play-state", "paused");
    });
}

MusicPlayer.prototype.nextSong = function () {
    var _this = this;
    this.$next.on("click", function () {
        _this.audio.pause();
        _this.getSong();
    });
}

MusicPlayer.prototype.autoPlay = function () {
    var _this = this;
    this.$audio.on("ended", function () {
        _this.getSong();
    });
}

MusicPlayer.prototype.changeChannel = function () {
    var _this = this;
    this.$channelsList.on("click", "li", function () {
        _this.audio.pause();
        _this.$playPause.removeClass("icon-pause").addClass("icon-play");
        $(this).siblings().removeClass("c-channels-list__item--active");
        $(this).addClass("c-channels-list__item--active");
        _this.channelId = $(this).attr("data-channel_id");
        _this.channelName = $(this).attr("data-channel_name");
        _this.getSong();
    });
}

MusicPlayer.prototype.showLyric = function () {
    var _this = this;
    this.$lyricBtn.on("click", function () {
        if (_this.$lyric.css("display") !== "none") {
            if(window.innerWidth<768){
                _this.poster.fadeIn();
            }
            _this.$lyric.fadeOut();
            _this.$lyricBtn.removeClass("c-setting__lyric--active")
        } else {
            if(window.innerWidth<768){
                _this.poster.fadeOut();
            }
            _this.$lyric.fadeIn();
            _this.$lyricBtn.addClass("c-setting__lyric--active")
        }
    });
}

MusicPlayer.prototype.showChannelsList = function () {
    var _this = this;
    this.$channelBtn.on("click", function (event) {
        event.stopPropagation();
        if (_this.$channelsList.css("display") !== "none") {
            _this.$channelsList.fadeOut();
            _this.$channelBtn.removeClass("icon-cross").addClass("icon-menu");
        } else {
            _this.$channelsList.fadeIn();
            _this.$channelBtn.removeClass("icon-menu").addClass("icon-cross");
        }
    });
    $("body").on("click", function () {
        _this.$channelsList.fadeOut();
        _this.$channelBtn.removeClass("icon-cross").addClass("icon-menu");
    });
}

MusicPlayer.prototype.setTime = function () {
    var _this = this;
    this.$audio.on("durationchange", function () {
        _this.totalTime = _this.audio.duration;
        var text = _this.formatTime(_this.totalTime);
        _this.$totalTime.text(text);
    });
    setInterval(function () {
        _this.curTime = _this.audio.currentTime;
        var text = _this.formatTime(_this.curTime);
        _this.$curTime.text(text);
        var baseWidth = _this.$baseBar.width();
        var curWdth = baseWidth *(_this.curTime/_this.totalTime);
        _this.$curBar.width(curWdth);
    }, 500);
}

MusicPlayer.prototype.formatTime = function (num) {
    var total = parseInt(num);
    var min = parseInt(total / 60);
    var sec = parseInt(total % 60);
    if (sec < 10) {
        sec = "0" + sec;
    };
    return min + " : " + sec;
}

MusicPlayer.prototype.changeProgress = function () {
    var _this = this;
    this.$baseBar.on("click", function (e) {
        var posX = e.clientX;
        var offsetLeft = $(this).offset().left;
        var target = posX - offsetLeft;
        _this.audio.currentTime = _this.totalTime * target / _this.$baseBar.width();
        _this.$curBar.width(target);
    });
}

MusicPlayer.prototype.setMute = function () {
    var _this = this;
    this.$volumeBtn.on("click", function () {
        if (_this.audio.volume) {
            _this.audio.volume = 0;
            _this.$volumeBtn.removeClass("icon-volume").addClass("icon-mute");
        } else {
            _this.audio.volume = _this.volume;
            _this.$volumeBtn.removeClass("icon-mute").addClass("icon-volume");
        }
    });
}

MusicPlayer.prototype.changeVolume = function () {
    var _this = this;
    this.$curVolume.width(_this.audio.volume * 100 + "%");
    this.$basicVolume.on("click", function (e) {
        var posX = e.clientX;
        var offsetLeft = $(this).offset().left;
        var target = posX - offsetLeft;
        _this.audio.volume = 1 * target / _this.$basicVolume.width();
        _this.volume = _this.audio.volume;
        _this.$curVolume.width(target);
        if(_this.$volumeBtn.hasClass('icon-mute')){
            _this.$volumeBtn.removeClass("icon-mute").addClass("icon-volume");
        }
    });

}
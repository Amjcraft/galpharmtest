define(["modules/jquery-mozu", "vendor/bxSlider/jquery.bxslider"], function($) {
    $(document).ready(function() {
        var defaults = {
            // GENERAL
            mode : 'horizontal',
            slideSelector : '',
            infiniteLoop : true,
            hideControlOnEnd : false,
            speed : 3000,
            easing : null,
            slideMargin : 0,
            startSlide : 0,
            randomStart : false,
            captions : false,
            ticker : false,
            tickerHover : false,
            adaptiveHeight : true,
            adaptiveHeightSpeed : 500,
            video : false,
            useCSS : true,
            preloadImages : 'visible',
            responsive : true,
            slideZIndex : 50,
            wrapperClass : 'bl-slider-wrapper',

            // TOUCH
            touchEnabled : true,
            swipeThreshold : 50,
            oneToOneTouch : true,
            preventDefaultSwipeX : true,
            preventDefaultSwipeY : false,

            // PAGER
            pager : true,
            pagerType : 'full',
            pagerShortSeparator : ' / ',
            pagerSelector : null,
            buildPager : null,
            pagerCustom : null,

            // CONTROLS
            controls : true,
            nextText : 'Next',
            prevText : 'Prev',
            nextSelector : null,
            prevSelector : null,
            autoControls : false,
            startText : 'Start',
            stopText : 'Stop',
            autoControlsCombine : false,
            autoControlsSelector : null,

            // AUTO
            auto : false,
            pause : 4000,
            autoStart : true,
            autoDirection : 'next',
            autoHover : false,
            autoDelay : 0,
            autoSlideForOnePage : false,

            // CAROUSEL
            minSlides : 1,
            maxSlides : 1,
            moveSlides : 0,
            slideWidth : 0,

            // CALLBACKS
            onSliderLoad : function() {
            },
            onSlideBefore : function() {
            },
            onSlideAfter : function() {
            },
            onSlideNext : function() {
            },
            onSlidePrev : function() {
            },
            onSliderResize : function() {
            }
        };


        $('.bl-slider').each(function() {
            var $this = $(this);
            var options = $.extend({}, defaults, $this.data('bl-slider-config'));
            //console.log($this.data('bl-slider-config'));
            $this.bxSlider(options);
            $('.bl-slider').show("fade");
        });

        // $('.owl-carousel.single').each(function() {
        //     var $this = $(this);
        //     var widgetOptions = $.extend({}, defaults, $this.data('bl-slider-config'));
        //     var options = {
        //         navigation : false, // Show next and prev buttons
        //         paginationSpeed : 400,
        //         autoPlay : widgetOptions.speed,
        //         rewindSpeed : 0,
        //         transitionStyle : "fade",
        //         autoHeight: widgetOptions.adaptiveHeight,
        //         stopOnHover: true,
        //         singleItem : true
        //         // "singleItem:true" is a shortcut for:
        //         // items : 1,
        //         // itemsDesktop : false,
        //         // itemsDesktopSmall : false,
        //         // itemsTablet: false,
        //         // itemsMobile : false
        //     };
        //     $this.owlCarousel(options);
        //     if (widgetOptions.wrapperClass) {
        //         $this.wrap('<div class="'+widgetOptions.wrapperClass+'"></div>');
        //     }
        // });

    });
});

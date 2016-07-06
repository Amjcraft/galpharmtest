require(['modules/jquery-mozu', 'shim!vendor/slick[jQuery=jquery]'], function($) {
    
    $(document).ready(function() {
        $(".hero-banner").slick({
            dots: true,
            autoplay: true,
            autoplaySpeed: 4000
        });
    });

});





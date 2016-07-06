$(document).ready(function(){
    $("body img:last").addClass("visuallyhidden");
    $(".accordion").accordion({
        heightStyle: "content"
    });
    $.cookiesDirective({
        explicitConsent: true,
        position: 'bottom',
        duration: 1000,
        message: "This site uses cookies. Some of the cookies we use are essential for parts of the website to operate."
    });

    $('.mz-productlist .mz-productlist-item').matchHeight();
    $('.mz-productlist .mz-productlisting-image').matchHeight();
    $('.mz-productlisting .mz-productlisting-title').matchHeight();
    $('.home-product-banners .banner h3').matchHeight();

    /*$(".member-sale-price").each(function() { 
        var hasPrice = $(this).text().split("."); 
        if (hasPrice.length > 1) { 
            $(this).siblings(".member-price").addClass("is-crossedout"); 
        } 
    });*/

    //SITE NAV SMALL SCREEN FUNCTIONALITY
    $(".mz-sitenav").each(function(){
        var $wrap = $(this),
            $toggle = $wrap.find(".toggle-nav");

        $toggle.on("click", function(e){
            e.preventDefault();
            var $this = $(this);
            if ( $this.hasClass("active") ){
                $("body").off("click", navToggle);
                $this.focus();
            } else {
                $("body").on("click", navToggle);
                $wrap.find(".mz-sitenav-list").focus();
            }
            $this.toggleClass("active").siblings(".mz-sitenav-list").slideToggle();
        });

        function navToggle(e) {
            if ($(e.target).closest(".mz-sitenav").length <= 0 && e.originalEvent) {
                $toggle.trigger("click");
            }                    
        }
    });
});

var freezeframe = (function($) {

  var images;
  var options;
  var is_touch_device;

  //////////////////////////////////////////////////////////////////////////////
  //                                                                          //
  //  Private Methods                                                         //
  //                                                                          //
  //////////////////////////////////////////////////////////////////////////////
  
  // decorated console.log warn message
  var warn = function(_message) {
    console.warn('freezeframe.js : ' + _message)
  }

  // filter captured images by selector
  var filter = function(_this, _selector) {
    var images = _this.images,
        filtered_images

    if(_selector != undefined && images.length > 1) {
      filtered_images = images.filter( $(_selector) );
      if (filtered_images.length == 0) {
        warn("no images found for selector " + _selector)
        return false;
      }
    } else {
      filtered_images = images;
    }

    return filtered_images;
  }

  // does the freezeframe instance have captured images ?
  var has_images = function(_this) {
    return _this.images.length == 0 ? false : true;
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                                                          //
  //  Constructor                                                             //
  //                                                                          //
  //////////////////////////////////////////////////////////////////////////////
  function freezeframe(_options) {
    var options;

    // default options
    this.options = {
      selector : '.freezeframe',
      animation_play_duration: 5000,
      non_touch_device_trigger_event: 'hover'
    }

    // new selector as string
    options = typeof _options == 'string' ? { 'selector': _options } : _options;

    // new options
    if(options) {
      for (attribute in options) {
        if (attribute in this.options) {
          this.options[attribute] = options[attribute]
        } else {
          warn(attribute + 'not a valid option')
        }
      }
    }

    // is this a touch device?
    this.is_touch_device = ('ontouchstart' in window || 'onmsgesturechange' in window);
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                                                          //
  //  Capture Images                                                          //
  //                                                                          //
  //////////////////////////////////////////////////////////////////////////////
  freezeframe.prototype.capture = function(_selector) {
    var selector;

    // passed in string or default string
    if(_selector !== undefined) {
      selector = _selector;
    } else if (this.options.selector !== undefined) {
      selector = this.options.selector;
    } else {
      warn("no selector passed to capture function or set in options")
      return false;
    }

    // empty jquery object to add into
    if(this.images == undefined) {
      this.images = $();
    }

    // add new selection, jquery keeps it non redundant
    this.images = this.images.add( $('img' + selector) );

    // get non gifs outta there
    for (i = 0; i < this.images.length; i++) {
      if (this.images[i].src.split('.').pop().toLowerCase().substring(0, 3) !== 'gif') {
        this.images.splice(i, 1);
      }
    }

    // if nothing was found, throw a fit
    if(this.images.length == 0) {
      console.warn('freezeframe : no gifs found for selector "' + selector + '"');
      return false;
    }

    return this;
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                                                          //
  //  Setup Elements                                                          //
  //                                                                          //
  //////////////////////////////////////////////////////////////////////////////
  freezeframe.prototype.setup = function() {
    var ff = this,
      setup_required = this.images.not('.ff-setup'),
      container_classnames = ['ff-container'];

    if(!has_images(ff)) {
      warn("unable to run setup(), no images captured")
      return false;
    } else if(setup_required.length == 0) {
      warn("unable to run setup(), no images require setup")
      return false;
    }

    setup_required.each(function(e) {
      var $image = $(this);

      $image.addClass('ff-setup ff-image');

      if($image.hasClass('freezeframe-responsive')) {
        container_classnames.push('ff-responsive');
      }

      $canvas = $('<canvas />', {
        class: 'ff-canvas'
      }).attr({
        width: 0,
        height: 0
      }).insertBefore($image);

      $image.add($canvas).wrapAll(
        $('<div />', {
          class: container_classnames.join(' ')
        })
      );

    });

    imagesLoaded(setup_required).on('progress', function(instance, image) {
      ff.process($(image.img));
    });

    return this;
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                                                          //
  //  Process Images                                                          //
  //                                                                          //
  //////////////////////////////////////////////////////////////////////////////
  // this should be a private method ? maybe
  freezeframe.prototype.process = function($_image) {
    var ff = this,
      $canvas = $_image.siblings('canvas'),
      transitionEnd = 'transitionend webkitTransitionEnd oTransitionEnd otransitionend',
      image_width = $_image[0].clientWidth,
      image_height = $_image[0].clientHeight;

    $canvas.attr({
      'width': image_width,
      'height': image_height
    });

    context = $canvas[0].getContext('2d');
    context.mozImageSmoothingEnabled = true;
    context.webkitImageSmoothingEnabled = true;
    context.imageSmoothingEnabled = true;
    context.drawImage($_image[0], 0, 0, image_width, image_height);

    $canvas.addClass('ff-canvas-ready').on(transitionEnd, function() {
      $(this).off(transitionEnd);
      $_image.addClass('ff-image-ready');
    })

    return this;
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                                                          //
  //  Attach Hover / Click Events                                             //
  //                                                                          //
  //////////////////////////////////////////////////////////////////////////////
  freezeframe.prototype.attach = function(_selector) {
    var ff = this,
      click_timeout,
      images;

    if(!has_images(ff)) {
      warn("unable to run attach(), no images captured")
      return false;
    }

    filter(ff, _selector).each(function(e) {

      var $image = $(this);
      var $canvas = $(this).siblings('canvas');

      // hover /////////////////////////////////////////////////////////////////
      if((!ff.is_touch_device && ff.options.non_touch_device_trigger_event == 'hover') || (ff.is_touch_device)) {

        $image.mouseenter(function() {
          (function() {
            $image.attr('src', $image[0].src);
            $canvas.removeClass('ff-canvas-ready').addClass('ff-canvas-active');
          })();
        })

        $image.mouseleave(function() {
          (function() {
            $canvas.removeClass('ff-canvas-active').addClass('ff-canvas-ready');
          })();
        })
      }

      // click /////////////////////////////////////////////////////////////////
      if((!ff.is_touch_device && ff.options.non_touch_device_trigger_event == 'click') || (ff.is_touch_device)) {

        var click_timeout;

        $image.click(function() {

          (function() {
            var clicked = $canvas.hasClass('ff-canvas-active');

            if(clicked) {
              clearTimeout(click_timeout);
              $canvas.removeClass('ff-canvas-active').addClass('ff-canvas-ready');

            } else {
              $image.attr('src', $image[0].src);
              $canvas.removeClass('ff-canvas-ready').addClass('ff-canvas-active');

              click_timeout = setTimeout(function() {
                $canvas.removeClass('ff-canvas-active').addClass('ff-canvas-ready');
              }, ff.options.animation_play_duration);

            }
          })();
        })
      }
    })

    return this;
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                                                          //
  //  Freeze Images                                                           //
  //                                                                          //
  //////////////////////////////////////////////////////////////////////////////
  freezeframe.prototype.freeze = function() {
    this.capture().setup().attach(); // ✨ tada ✨
    return this;
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                                                          //
  //  Trigger Animation                                                       //
  //                                                                          //
  //////////////////////////////////////////////////////////////////////////////

  // return false if image not done processing yet
  // save references in a better way

  freezeframe.prototype.trigger = function(_selector) {
    filter(_selector).each(function(e) {
      $(this).attr('src', $(this)[0].src);
      $(this).siblings('canvas').removeClass('ff-canvas-ready').addClass('ff-canvas-active');
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  //                                                                          //
  //  Release Animation                                                       //
  //                                                                          //
  //////////////////////////////////////////////////////////////////////////////

  // return false if image not done processing yet
  // save references in a better way

  freezeframe.prototype.release = function(_selector) {
    filter(_selector).each(function(e) {
      $(this).siblings('canvas').removeClass('ff-canvas-active').addClass('ff-canvas-ready');
    });
  }

  return freezeframe;

})(jQuery);
$(document).ready(function()
{
  function rgb2lab(rgb)
  {
    var r = rgb[0] / 255;
    var g = rgb[1] / 255;
    var b = rgb[2] / 255;
    var x, y, z;

    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    x = (x > 0.008856) ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
    y = (y > 0.008856) ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
    z = (z > 0.008856) ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
  }

  function lab2rgb(lab)
  {
    var y = (lab[0] + 16) / 116;
    var x = lab[1] / 500 + y;
    var z = y - lab[2] / 200;
    var r, g, b;

    x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16 / 116) / 7.787);
    y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16 / 116) / 7.787);
    z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16 / 116) / 7.787);

    r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    b = x * 0.0557 + y * -0.2040 + z * 1.0570;

    r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1 / 2.4) - 0.055) : 12.92 * r;
    g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1 / 2.4) - 0.055) : 12.92 * g;
    b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1 / 2.4) - 0.055) : 12.92 * b;

    return [Math.max(0, Math.min(1, r)) * 255,
      Math.max(0, Math.min(1, g)) * 255,
      Math.max(0, Math.min(1, b)) * 255
    ]
  }

  function deltaE(labA, labB)
  {
    var deltaL = labA[0] - labB[0];
    var deltaA = labA[1] - labB[1];
    var deltaB = labA[2] - labB[2];

    var c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    var c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);

    var deltaC = c1 - c2;
    var deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);

    var sc = 1.0 + 0.045 * c1;
    var sh = 1.0 + 0.015 * c1;

    var deltaLKlsl = deltaL / (1.0);
    var deltaCkcsc = deltaC / (sc);
    var deltaHkhsh = deltaH / (sh);

    var i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;

    return i < 0 ? 0 : Math.sqrt(i);
  }

  var imageUrl = null;

  var imgSrc;
  var imgDst;

  var canvasSrc = document.querySelector(`#canvas-src`);
  var canvasDst = document.querySelector(`#canvas-dst`);

  var stack = [];
  var stackRedo = [];

  var stackPreProcess = [
    // {
    //   color: [255, 255, 255],
    //   threshold: 10
    // },
    // {
    //   color: [0, 0, 0],
    //   threshold: 10
    // }
  ];


	$('#input-image').change(function(e)
	{
    var url = window.URL.createObjectURL(this.files[0]);

    $('#table-images').css('visibility', 'visible');
    $('#controls').css('visibility', 'visible');

		init(url);
  });

  $('#btn-remove-color').click(function(e)
  {
    if (!imageUrl)
    {
      return;
    }

    startModRemoveColor();
  });

  $('#btn-remove-undo').click(function(e)
  {
    if (!stack.length)
    {
      return;
    }

    popStackModifier();

    updateButtonUndoRedo();
    updateStackChange();
  });

  $('#btn-remove-redo').click(function(e)
  {
    if (!stackRedo.length)
    {
      return;
    }

    var mod = stackRedo.pop();
    stack.push(mod);

    updateButtonUndoRedo();
    updateStackChange();
  });

  function getThreshold()
  {
    return parseInt(document.querySelector(`#threshold`).value);
  }

	function canvasLoadImage(url, canvasEl)
  {
    var img = new Image();
    img.src = url;
    img.onload = function()
    {
      canvasEl.width = img.width;
      canvasEl.height = img.height;
      canvasEl.getContext("2d").drawImage(img, 0, 0);
    };

    return img;
  }

  function canvasPutImage(canvasEl, pixels)
  {
    var context = canvasEl.getContext("2d");
    context.putImageData(pixels, 0, 0);
  }

  function init(url)
  {
    imageUrl = url;

    imgSrc = canvasLoadImage(url, canvasSrc);
    imgDst = canvasLoadImage(url, canvasDst);

    stack = [];

    colorSamplerOff();

    updateStackChange();
    updateButtonUndoRedo();
  }

  function canvasGetImageDataUrl(canvas)
  {
    return canvas.toDataURL("image/png");
  }

  function colorSamplerOn()
  {
    $('#canvas-src').colorSampler(
    {
      onPreview: function(color)
      {
      },
      onSelect: function(color)
      {
        onSamplerSelectColor(color.match(/\d+/g));
      }
    });

    $('#canvas-dst').colorSampler(
      {
        onPreview: function(color)
        {
        },
        onSelect: function(color)
        {
          onSamplerSelectColor(color.match(/\d+/g));
        }
      });
  }

  function colorSamplerOff()
  {
    $('#canvas-src').off("colorSampler", "**" );
    $('#canvas-dst').off("colorSampler", "**" );
    $('#canvas-src').unbind();
    $('#canvas-dst').unbind();

    $('.color-sampler-preview.active').removeClass('active');
  }

  function onSamplerSelectColor(color)
  {
    console.log(color);

    var threshold = getThreshold();
    var mod = createModifier(color, threshold)

    addStackModifier(mod);

    endModRemoveColor();

    updateStackChange();

    updateButtonUndoRedo();
  }

  function createModifier(color, threshold)
  {
    return {
      "color": color,
      "threshold": threshold,
    };
  }

  function createModifierKeep(color, threshold)
  {
    return {
      "type": "+",
      "color": color,
      "threshold": threshold,
    };
  }

  function createModifierRemove(color, threshold)
  {
    return {
      "type": "-",
      "color": color,
      "threshold": threshold,
    };
  }

  function addStackModifier(mod)
  {
    if (inStackModifier(mod))
    {
      return;
    }

    stackRedo = [];
    stack.push(mod);

    updateButtonUndoRedo();
  }

  function popStackModifier()
  {
    var mod = stack.pop();
    stackRedo.push(mod);

    updateButtonUndoRedo();
  }

  function inStackModifier(mod)
  {
    for (let index = 0; index < stack.length; index++)
    {
      var m = stack[index];
      if (mod == m)
      {
        return true;
      }

      if (equal2Modifiers(m, mod))
      {
        return true;
      }
    }

    return false;
  }

  function equal2Modifiers(a, b)
  {
    return a.threshold == b.threshold &&
      a.color[0] == b.color[0] &&
      a.color[1] == b.color[1] &&
      a.color[2] == b.color[2];
  }

  function updateStackChange()
  {
    if (imgSrc && imgDst)
    {
      var pixels = getCanvasPixels(canvasSrc);

      pixels = processImageStackModifiers(pixels, stackPreProcess);
      pixels = processImageStackModifiers(pixels, stack);

      canvasPutImage(canvasDst, pixels);
    }

    // setTimeout(function()
    // {
    //   var imageDataUrl = canvasDst.toDataURL("image/png");
    //   canvasLoadImage(imageDataUrl, canvasDst);
    // }, 100);

    if (stack.length)
    {
      setTimeout(function() {
        showDownloadImageButton();
      }, 100);
    }
  }

  function updateButtonUndoRedo()
  {
    if (stack.length)
    {
      // $('#btn-remove-undo').show();
      // $('#btn-remove-undo').css('visibility', 'visible');
      $('#btn-remove-undo').removeAttr("disabled");
    }
    else
    {
      // $('#btn-remove-undo').hide();
      // $('#btn-remove-undo').css('visibility', 'hidden');
      $('#btn-remove-undo').attr("disabled", true);
    }

    if (stackRedo.length)
    {
      // $('#btn-remove-redo').show();
      // $('#btn-remove-redo').css('visibility', 'visible');
      $('#btn-remove-redo').removeAttr("disabled");
    }
    else
    {
      // $('#btn-remove-redo').hide();
      // $('#btn-remove-redo').css('visibility', 'hidden');
      $('#btn-remove-redo').attr("disabled", true);
    }
  }

  function startModRemoveColor()
  {
    $('#btn-remove-color').attr("disabled", true);

    $('#btn-remove-undo').attr("disabled", true);
    $('#btn-remove-redo').attr("disabled", true);

    colorSamplerOn();
  }

  function endModRemoveColor()
  {
    $('#btn-remove-color').removeAttr("disabled");

    colorSamplerOff();
  }

  function getCanvasPixels(canvasEl, x, y, width, height)
  {
    x = x || 0;
    y = y || 0;

    if (!width)
    {
      width = canvasEl.width;
    }

    if (!height)
    {
      height = canvasEl.height;
    }

    var pixels = canvasEl.getContext("2d").getImageData(x, y, width, height);

    return pixels;
  }

  function processRemoveImageColorThreshold(pixels, color, threshold)
  {
    // var colorTarget = {
    //   r: parseInt(color[0]),
    //   g: parseInt(color[1]),
    //   b: parseInt(color[2])
    // };
    // console.log(colorTarget);
    // var labTarget = rgb2lab([colorTarget.r, colorTarget.g, colorTarget.b]);

    var labTarget = rgb2lab(color);

    var pixelsData = pixels.data;

    for (var i = 0, len = pixelsData.length; i < len; i += 4)
    {
      var r = pixelsData[i];
      var g = pixelsData[i + 1];
      var b = pixelsData[i + 2];
      if (pixelsData[i + 3] != 0)
      {
        var labPix = rgb2lab([r, g, b]);
        var valDelta = deltaE(labTarget, labPix)

        if (valDelta < threshold)
        {
          pixelsData[i + 3] = 0;
        }
      }
    }

    return pixels;
  }

  function processImageModifier(pixels, mod)
  {
    var color = mod.color;
    var threshold = mod.threshold;

    return processRemoveImageColorThreshold(pixels, color, threshold);
  }

  function processImageStackModifiers(pixels, stack)
  {
    for (let index = 0; index < stack.length; index++)
    {
      var mod = stack[index];
      pixels = processImageModifier(pixels, mod);
    }

    return pixels;
  }

  function showDownloadImageButton()
  {
    var container = $('#container');
    container.html('');
    var imageDataUrl = canvasGetImageDataUrl(canvasDst);
    container.append(`<span id="og"><a id="btn-save" download="stamp.png" href='${imageDataUrl}'>⬇</a></span><br>`);
  }

  function convertImageUrlToDataUrl(url, callback)
  {
    function getDataUrl(img)
    {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/jpeg');
    }

    var img = document.createElement('img');
    img.src = url;
    img.addEventListener('load', function(event)
    {
      const dataUrl = getDataUrl(event.currentTarget);
      callback(dataUrl);
    });
  }

  setTimeout(function()
  {
    // $('#table-images').css('visibility', 'visible');
    // $('#controls').css('visibility', 'visible');

    // init("./res/sample.png");
    // setTimeout(function()
    // {
    //   var imageDataUrl = canvasSrc.toDataURL("image/png");
    //   init(imageDataUrl);
    // }, 100);

    // (async function()
    // {
    //   let blob = await fetch("./res/sample.png").then(r => r.blob());
    //   let dataUrl = await new Promise(resolve =>
    //   {
    //     let reader = new FileReader();
    //     reader.onload = () => resolve(reader.result);
    //     reader.readAsDataURL(blob);
    //   });

    //   $('#table-images').css('visibility', 'visible');
    //   $('#controls').css('visibility', 'visible');

    //   init(dataUrl);
    // })();

    convertImageUrlToDataUrl('./res/sample.png', function(dataUrl)
    {
      $('#table-images').css('visibility', 'visible');
      $('#controls').css('visibility', 'visible');

      init(dataUrl);
    });

  }, 100);

});

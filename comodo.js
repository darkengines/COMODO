function DynPic($mainContainer, $commentsContainer, $optionsContainer, pictureUrl, scale) {
	var Instance = this;
	this.$MainContainer = $mainContainer;
	this.$CommentsContainer = $commentsContainer;
	this.$OptionsContainer = $optionsContainer;
	this.HideRegions = false;
	this.DisableRegions = false;
	$.ajax({
		url: 'Options.html',
		cache: false,
		success: function(result) {
			var $content = $(result);
			$content.appendTo(Instance.$OptionsContainer);
			$hideRegions = $('#hideRegions', $content);
			$disableRegions = $('#disableRegions', $content);
			$hideRegions.change(function() {
				Instance.HideRegions = $hideRegions.is(':checked');
				Instance.Refresh();
			});
			$disableRegions.change(function() {
				Instance.DisableRegions = $disableRegions.is(':checked');
				Instance.Refresh();
			});
		}
	});
	this.Scale = scale;
	this.Picture = new Image();
	this.IsMouseDown = false;
	this.Regions = new Array();
	this.FocusedRegionId = null;
	this.OnRegionCreation = false;
	
	this.Picture.onload = function() {
		Instance.Width = Instance.Picture.width * Instance.Scale;
		Instance.Height = Instance.Picture.height * Instance.Scale;
		Instance.$Canvas = $('<canvas width="'+Instance.Width+'" height="'+Instance.Height+'">Your browser doesn\'t supports this application.</canvas>');
		Instance.$Canvas.appendTo(Instance.$MainContainer);
		Instance.Canvas = Instance.$Canvas.get(0);
		Instance.Context = Instance.Canvas.getContext('2d');
		Instance.Context.drawImage(Instance.Picture, 0, 0, Instance.Width, Instance.Height);
		Instance.PosX = Instance.$Canvas.offset().left;
		Instance.PosY = Instance.$Canvas.offset().top;
		function isInCanvas(x, y) {
			return inRect(x, y, Instance.PosX, Instance.PosY, Instance.Width, Instance.Height);
		}
		$(document).mousemove(function(event) {
			if (isInCanvas(event.pageX, event.pageY)) {
				var x = event.pageX - Instance.PosX;
				var y = event.pageY - Instance.PosY;
				Instance.MouseMove(x, y);
			}
		});
		$(document).mousedown(function(event) {
			if (isInCanvas(event.pageX, event.pageY)) {
				var x = event.pageX - Instance.PosX;
				var y = event.pageY - Instance.PosY;
				Instance.MouseDown(x, y);
			}
		});
		$(document).mouseup(function(event) {
			if (isInCanvas(event.pageX, event.pageY)) {
				var x = event.pageX - Instance.PosX;
				var y = event.pageY - Instance.PosY;
				Instance.MouseUp(x, y);
			} else {
				Instance.MouseUpOut();
			}
		});
		$(document).click(function(event) {
			if (isInCanvas(event.pageX, event.pageY)) {
				var x = event.pageX - Instance.PosX;
				var y = event.pageY - Instance.PosY;
				Instance.Click(x, y);
			}
		});
	}
	this.Picture.src = pictureUrl;
	this.DragX = 0;
	this.DragY = 0;
	if(typeof DynPic.initialized == "undefined" ) {
		DynPic.prototype.Refresh = function() {
			Instance.Context.drawImage(Instance.Picture, 0, 0, Instance.Width, Instance.Height);
			if (!Instance.HideRegions) {
				$.each(Instance.Regions, function() {
					if (this.Id != Instance.FocusedRegionId) {
						Instance.Context.strokeRect(this.x*Instance.Scale, this.y*Instance.Scale, this.w*Instance.Scale, this.h*Instance.Scale);
					}
				});
			}
		}
		DynPic.prototype.GetRegionIndexById = function(id) {
			var i = 0;
			var found = 0;
			while (!found && i < Instance.Regions.length) {
				found = Instance.Regions[i].Id == id;
				++i;
			}
			if (found) return i-1;
			return null;
		}
		DynPic.prototype.MouseMove = function(x, y) {
			if (Instance.IsMouseDown) {
				Instance.Refresh();
				Instance.Context.strokeRect(Instance.DragX, Instance.DragY, x - Instance.DragX, y -Instance.DragY);
			} else {
				if (!Instance.DisableRegions) {
					var i = Instance.Regions.length-1;
					var collision = false;
					if (Instance.FocusedRegionId == null) {
						while (!collision && i >= 0) {
							var region = Instance.Regions[i];
							collision = inRect(x, y, region.x*Instance.Scale, region.y*Instance.Scale, region.w*Instance.Scale, region.h*Instance.Scale);
							if (collision) {
								Instance.FocusedRegionId = region.Id;
								Instance.Refresh();
								var scale = region.Zoom*Instance.Scale;
								var nx = region.x*Instance.Scale + region.w*(Instance.Scale - scale)/2;
								var ny = region.y*Instance.Scale + region.h*(Instance.Scale - scale)/2;
								var nw = region.w*scale;
								var nh = region.h*scale;
								if (nx < 0) nx = 0;
								if (ny < 0) ny = 0;
								if (nx + region.w*scale > Instance.Width) nx -= nx + region.w*scale - Instance.Width;
								if (ny + region.h*scale > Instance.Height) ny -= ny + region.h*scale - Instance.Height;
								if (nx < 0) {
									var factor = Instance.Width / nw
									nw *= factor;
									nh *= factor;
									nx = 0;
								}
								if (ny < 0) {
									var factor = Instance.Height / nh
									nw *= factor;
									nh *= factor;
									ny = 0;
								}
								Instance.Context.drawImage(Instance.Picture, region.x, region.y, region.w, region.h, nx, ny, nw, nh);
							}
							--i;
						}
					} else {
						var region = Instance.Regions[Instance.GetRegionIndexById(Instance.FocusedRegionId)];
						if (!inRect(x, y, region.x*Instance.Scale, region.y*Instance.Scale, region.w*Instance.Scale, region.h*Instance.Scale)) {
							Instance.FocusedRegionId = null;
							Instance.Refresh();
						}
					}
				}
			}
		};
		DynPic.prototype.MouseDown = function(x, y) {
			if (!Instance.OnRegionCreation) {
				Instance.DragX = x;
				Instance.DragY = y;
				Instance.IsMouseDown = true;
			}
		};
		DynPic.prototype.MouseUp = function(x, y) {
			if (!Instance.OnRegionCreation) {
				Instance.IsMouseDown = false;
				var rw = x - Instance.DragX;
				var rh = y - Instance.DragY;
				if (rw != 0 && rh != 0) {
					var rx = Instance.DragX;
					var ry = Instance.DragY;
					if (rw < 0) {
						rx = Instance.DragX + rw;
						rw = -rw
					}
					if (rh < 0) {
						ry = Instance.DragY + rh;
						rh = -rh;
					}
					Instance.OnRegionCreation = true;
					var popup = new CreateRegionPopup(Instance.DragX+Instance.PosX, Instance.DragY+Instance.PosY, function(result) {
						Instance.Regions.push(new Region(rx/Instance.Scale, ry/Instance.Scale, rw/Instance.Scale, rh/Instance.Scale, result.title, result.comment, result.zoom));
						Instance.OnRegionCreation = false;
						Instance.Refresh();
					});
				} else {
					Instance.Refresh();
				}
			}
		};
		DynPic.prototype.MouseUpOut = function() {
			Instance.IsMouseDown = false;
		};
		DynPic.prototype.Click = function(x, y) {
			
		};
		DynPic.initialized = true;
	}
}
function Region(x, y, width, height, title, comment, zoom) {
	var Instance = this;
	this.x = x;
	this.y = y;
	this.w = width;
	this.h = height;
	this.Id = Math.floor(Math.random()*1001);
	this.Comment = comment;
	this.Zoom = zoom;
	this.Title = title;
	if(typeof Region.initialized == "undefined" ) {

		Region.initialized = true;
	}
}
function inRect(x, y, rx, ry, rw, rh) {
	return x >= rx && x<=rx+rw && y >= ry && y<=ry+rh
}
function CreateRegionPopup(x, y, callback) {
	var Instance = this;
	this.$Content = null;
	this.Callback = callback;
	$.ajax({
		url: 'createRegionPopup.html',
		cache: false,
		success: function(result) {
			var $content = $(result);
			$content.css('position', 'absolute');
			$content.css('left', x);
			$content.css('top', y);
			Instance.$Content = $content;
			Instance.$Content.appendTo($('body'));
			var okButton = $('#ok', $content);
			var cancelButton = $('#cancel', $content);
			okButton.click(function() {
				Instance.Callback({
					title: $('#title', $content).val(),
					comment: $('#comment', $content).val(),
					zoom: $('#zoom', $content).val()
				});
				$content.remove();
				Instance = null;
			});
			cancelButton.click(function() {
				$content.remove();
				Instance = null;
			});
		}
	});
	if(typeof Region.initialized == "undefined" ) {
		
		Region.initialized = true;
	}
}
function Button(x, y, img, callback) {
	var Instance = this;
	this.x = x;
	this.y = y;
	this.w = width;
	this.h = height;
	this.Callback = callback;
	this.Id = Math.floor(Math.random()*1001);
	this.Comment = comment;
	this.Zoom = zoom;
	this.Title = title;
	if(typeof Region.initialized == "undefined" ) {

		Region.initialized = true;
	}
}
/*

3ds file loading example in Away3d

Demonstrates:

How to use the Loader object to load an embedded internal 3ds model.
How to map an external asset reference inside a file to an internal embedded asset.
How to extract material data and use it to set custom material properties on a model.

Code by Rob Bateman
rob@infiniteturtles.co.uk
http://www.infiniteturtles.co.uk

This code is distributed under the MIT License

Copyright (c) The Away Foundation http://www.theawayfoundation.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

import {AssetEvent, LoaderEvent, Vector3D, AssetLibrary, IAsset, LoaderContext, URLRequest, RequestAnimationFrame} from "awayjs-full/lib/core";
import {BitmapImage2D, Sampler2D, ElementsType, Single2DTexture} from "awayjs-full/lib/graphics";
import {HoverController, Sprite, DirectionalLight, LoaderContainer, PrimitivePlanePrefab, StaticLightPicker} from "awayjs-full/lib/scene";
import {MethodMaterial, ShadowSoftMethod} from "awayjs-full/lib/materials";
import {Max3DSParser} from "awayjs-full/lib/parsers";

import {View} from "awayjs-full/lib/view";

class Basic_Load3DS
{
	//engine variables
	private _view:View;
	private _cameraController:HoverController;

	//material objects
	private _groundMaterial:MethodMaterial;

	//light objects
	private _light:DirectionalLight;
	private _lightPicker:StaticLightPicker;
	private _direction:Vector3D;

	//scene objects
	private _loader:LoaderContainer;
	private _plane:PrimitivePlanePrefab;
	private _ground:Sprite;

	//navigation variables
	private _timer:RequestAnimationFrame;
	private _time:number = 0;
	private _move:boolean = false;
	private _lastPanAngle:number;
	private _lastTiltAngle:number;
	private _lastMouseX:number;
	private _lastMouseY:number;

	/**
	 * Constructor
	 */
	constructor()
	{
		this.init();
	}

	/**
	 * Global initialise function
	 */
	private init():void
	{
		this.initEngine();
		this.initLights();
		this.initMaterials();
		this.initObjects();
		this.initListeners();
	}

	/**
	 * Initialise the engine
	 */
	private initEngine():void
	{
		this._view = new View();

		//setup the camera for optimal shadow rendering
		this._view.camera.projection.far = 2100;

		//setup controller to be used on the camera
		this._cameraController = new HoverController(this._view.camera, null, 45, 20, 1000, 10);
	}

	/**
	 * Initialise the lights
	 */
	private initLights():void
	{
		this._light = new DirectionalLight(-1, -1, 1);
		this._light.castsShadows = true;
		this._direction = new Vector3D(-1, -1, 1);
		this._lightPicker = new StaticLightPicker([this._light]);
		this._view.scene.addChild(this._light);
	}

	/**
	 * Initialise the materials
	 */
	private initMaterials():void
	{
		this._groundMaterial = new MethodMaterial();
		this._groundMaterial.ambientMethod.texture = new Single2DTexture();
		this._groundMaterial.shadowMethod = new ShadowSoftMethod(this._light , 10 , 5 );
		this._groundMaterial.style.sampler = new Sampler2D(true, true, true);
		this._groundMaterial.style.addSamplerAt(new Sampler2D(true, true), this._light.shadowMapper.depthMap);
		this._groundMaterial.shadowMethod.epsilon = 0.2;
		this._groundMaterial.lightPicker = this._lightPicker;
		this._groundMaterial.specularMethod.strength = 0;
		//this._groundMaterial.mipmap = false;
	}

	/**
	 * Initialise the scene objects
	 */
	private initObjects():void
	{
		this._loader = new LoaderContainer();
		this._loader.transform.scaleTo(300, 300, 300);
		this._loader.z = -200;
		this._view.scene.addChild(this._loader);

		this._plane = new PrimitivePlanePrefab(this._groundMaterial, ElementsType.TRIANGLE, 1000, 1000);
		this._ground = <Sprite> this._plane.getNewObject();
		this._ground.castsShadows = false;
		this._view.scene.addChild(this._ground);
	}

	/**
	 * Initialise the listeners
	 */
	private initListeners():void
	{
		window.onresize  = (event:UIEvent) => this.onResize(event);

		document.onmousedown = (event:MouseEvent) => this.onMouseDown(event);
		document.onmouseup = (event:MouseEvent) => this.onMouseUp(event);
		document.onmousemove = (event:MouseEvent) => this.onMouseMove(event);

		this.onResize();

		this._timer = new RequestAnimationFrame(this.onEnterFrame, this);
		this._timer.start();

		//setup the url map for textures in the 3ds file
		var loaderContext:LoaderContext = new LoaderContext();
		loaderContext.mapUrl("texture.jpg", "assets/soldier_ant.jpg");

		this._loader.addEventListener(AssetEvent.ASSET_COMPLETE, (event:AssetEvent) => this.onAssetComplete(event));
		this._loader.load(new URLRequest("assets/soldier_ant.3ds"), loaderContext, null, new Max3DSParser(false));

		AssetLibrary.addEventListener(LoaderEvent.LOAD_COMPLETE, (event:LoaderEvent) => this.onResourceComplete(event));
		AssetLibrary.load(new URLRequest("assets/CoarseRedSand.jpg"));
	}

	/**
	 * Navigation and render loop
	 */
	private onEnterFrame(dt:number):void
	{
		this._time += dt;

		this._direction.x = -Math.sin(this._time/4000);
		this._direction.z = -Math.cos(this._time/4000);
		this._light.direction = this._direction;

		this._view.render();
	}

	/**
	 * Listener function for asset complete event on loader
	 */
	private onAssetComplete(event:AssetEvent)
	{
		var asset:IAsset = event.asset;

		switch (asset.assetType)
		{
			case Sprite.assetType :
				var sprite:Sprite = <Sprite> event.asset;
				sprite.castsShadows = true;
				break;
			case MethodMaterial.assetType :
				var material:MethodMaterial = <MethodMaterial> event.asset;
				material.shadowMethod = new ShadowSoftMethod(this._light , 10 , 5 );
				material.shadowMethod.epsilon = 0.2;
				material.lightPicker = this._lightPicker;
				material.specularMethod.gloss = 30;
				material.specularMethod.strength = 1;
				material.style.color = 0x303040;
				material.diffuseMethod.multiply = false;
				material.ambientMethod.strength = 1;

				break;
		}
	}

	/**
	 * Listener function for resource complete event on asset library
	 */
	private onResourceComplete (event:LoaderEvent)
	{
		var assets:Array<IAsset> = event.assets;
		var length:number = assets.length;

		for (var c:number = 0; c < length; c ++) {
			var asset:IAsset = assets[c];

			console.log(asset.name, event.url);

			switch (event.url) {
				//plane textures
				case "assets/CoarseRedSand.jpg" :
					this._groundMaterial.style.image = <BitmapImage2D> asset;
					break;
			}
		}
	}

	/**
	 * Mouse down listener for navigation
	 */
	private onMouseDown(event:MouseEvent):void
	{
		this._lastPanAngle = this._cameraController.panAngle;
		this._lastTiltAngle = this._cameraController.tiltAngle;
		this._lastMouseX = event.clientX;
		this._lastMouseY = event.clientY;
		this._move = true;
	}

	/**
	 * Mouse up listener for navigation
	 */
	private onMouseUp(event:MouseEvent):void
	{
		this._move = false;
	}

	private onMouseMove(event:MouseEvent)
	{
		if (this._move) {
			this._cameraController.panAngle = 0.3*(event.clientX - this._lastMouseX) + this._lastPanAngle;
			this._cameraController.tiltAngle = 0.3*(event.clientY - this._lastMouseY) + this._lastTiltAngle;
		}
	}

	/**
	 * stage listener for resize events
	 */
	private onResize(event:UIEvent = null):void
	{
		this._view.y = 0;
		this._view.x = 0;
		this._view.width = window.innerWidth;
		this._view.height = window.innerHeight;
	}
}


window.onload = function ()
{
	new Basic_Load3DS();
}
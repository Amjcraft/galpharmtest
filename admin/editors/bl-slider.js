



function saveContent(){
	var vals = [];
	slideStore.each(function(e){
		vals.push(e.data.slidecontent);		
	});
	
	var valStr = vals.join("<!--slideseparator-->");
	
	
	slideValue.setValue(valStr); 
	
}



var slideStore = Ext.create('Ext.data.Store', {
    storeId:'bl-slider-slides',
    fields:['slidecontent'],
    listeners: {
		dataChanged: function(store, opts){
			saveContent();
			
			var maxSlide = store.count() - 1;
			maxSlide = maxSlide < 0 ? 0 : maxSlide;
			
			Options.general.startSlide.setMaxValue(maxSlide);
			if(Options.general.startSlide.getValue() > maxSlide){
				Options.general.startSlide.setValue(maxSlide);
			}
			
		}
	}
});

var rowEditing = Ext.create('Ext.grid.plugin.CellEditing', {
	clicksToEdit: 2
});

var slideGrid = Ext.create('Ext.grid.Panel',{
	title: 'Slides',
	name:  'slides',
	store: slideStore,
	collapsible: true,
	collapsed: false,
	columns: [				
		{
			
			dataIndex: 'slidecontent', 
			flex: 1,
            editor: {
                xtype: 'textareafield' 
            }
        }
	],
	dockedItems: [
		{
			xtype: 'toolbar',
			items: [
				{
					text: 'Add',
					iconCls: 'icon-add',
					handler: function(){
						// empty record
						slideStore.insert(0,{});
						rowEditing.startEdit(0, 0);
					}
				}, 
				{
					text: 'Delete',
					iconCls: 'icon-delete',
					handler: function(){
						var selection = slideGrid.getView().getSelectionModel().getSelection()[0];
						if (selection) {
							slideStore.remove(selection);
						}
					}
				}
			]
		}
	],
	listeners: {
		edit: function(editior,e){
			saveContent();
		}	
	},
	selType: 'rowmodel',
	viewConfig: {
        plugins: {
            ptype: 'gridviewdragdrop',
            dragText: 'Drag and drop to reorganize'
        }
   },
	plugins: [
        rowEditing
    ]
});

var slideValue = Ext.create("Ext.form.field.TextArea",{
	"fieldLabel": "Content",
	"name": "slidecontent",
	"allowBlank": true,
	"hidden": true,
	"listeners": {
		render: function(){
			var valStr = this.getValue();
			var vals = valStr.split("<!--slideseparator-->");
			console.log(vals);
			Ext.Array.each(vals,function(e,i){
				slideStore.add({slidecontent: e});
			});
		}
	}
	
}
);


var Options = {
    general : {
    	mode : Ext.create('Ext.form.field.ComboBox', {
            name: 'mode',
            fieldLabel: 'Mode',
            store: [
    			[
    				"horizontal",
    				"Horizontal Slide"
    			],
    			[
    				"vertical",
    				"Vertical Slide"
    			],
    			[
    				"fade",
    				"Fade Out"
    			]
    		]
        }),
        speed : Ext.create('Ext.form.field.Number', {
            name: 'speed',
            fieldLabel: 'Speed',
            minValue: 0
        }),
        randomStart: Ext.create('Ext.form.field.Checkbox', {
            name: 'randomStart',
            value: 'true',
            fieldLabel: 'Random Start',
            listeners: {
            	change: function(cb, nv, ov){
            		if(nv){
            			Options.general.startSlide.disable();
            		}else{
            			Options.general.startSlide.enable();
            		}
            	},
            	render: function(){
            		if(this.value){
            			Options.general.startSlide.disable();
            		}else{
            			Options.general.startSlide.enable();
            		}
            	}
            }
        }),
        startSlide: Ext.create('Ext.form.field.Number', {
            name: 'startSlide',
            fieldLabel: 'Start Slide',
            minValue: 0
        }),    
        infiniteLoop: Ext.create('Ext.form.field.Checkbox', {
            name: 'infiniteLoop',
            value: 'true',
            fieldLabel: 'Endless Loop'
        }),
        captions: Ext.create('Ext.form.field.Checkbox', {
            name: 'captions',
            value: 'true',
            fieldLabel: 'Use captions for images'
        }),
        wrapperClass : Ext.create('Ext.form.field.Text', {
            name: 'wrapperClass',
            fieldLabel: 'WrapperClass'
        }),
        cssInclude : Ext.create('Ext.form.field.Text', {
            name: 'cssInclude',
            fieldLabel: 'IncludeCSS'
        })
    },
    pager : {
    	enabled : Ext.create('Ext.form.field.Checkbox', {
            name: 'pager',
            value: 'true',
            fieldLabel: 'Enable Pager',
            listeners: {
            	change: function(cb, nv, ov){
            		if(nv){
            			Options.pager.pagerType.enable();
            			Options.pager.pagerShortSeparator.enable();
            		}else{
            			
            			Options.pager.pagerType.disable();
            			Options.pager.pagerShortSeparator.disable();
            		}
            	},
            	render: function(){
            		if(this.value){
            			Options.pager.pagerType.enable();
            			Options.pager.pagerShortSeparator.enable();
            		}else{
            			
            			Options.pager.pagerType.disable();
            			Options.pager.pagerShortSeparator.disable();
            		}
            	}
            }
        }),
        pagerType : Ext.create('Ext.form.field.ComboBox', {
            name: 'pagerType',
            fieldLabel: 'Pager Type',
            store: [
    			[
    				"full",
    				"Full"
    			],
    			[
    				"short",
    				"Short"
    			]
    		]
        }),
        pagerShortSeparator : Ext.create('Ext.form.field.Text', {
            name: 'pagerShortSeparator',
            value: '/',
            fieldLabel: 'Pager Seperator'
        })
    },
    controls : {
    	enabled : Ext.create('Ext.form.field.Checkbox', {
            name: 'controls',
            value: 'true',
            fieldLabel: 'Enable Controls'
        }),
        autoControls : Ext.create('Ext.form.field.Checkbox', {
            name: 'autoControls',
            value: 'true',
            fieldLabel: 'Enable Start/Stop',
            listeners: {
            	change: function(cb, nv, ov){
            		if(nv){
            			Options.controls.autoControlsCombine.enable();
            		}else{
            			Options.controls.autoControlsCombine.disable();
            		}
            	},
            	render: function(){
            		if(this.value){
            			Options.controls.autoControlsCombine.enable();
            		}else{
            			Options.controls.autoControlsCombine.disable();
            		}
            	}
            }
        }),  
    	autoControlsCombine : Ext.create('Ext.form.field.Checkbox', {
            name: 'autoControlsCombine',
            value: 'true',
            fieldLabel: 'Combine Start/Stop'
        })
    },
    auto : {
    	enabled : Ext.create('Ext.form.field.Checkbox', {
            name: 'auto',
            value: 'true',
            fieldLabel: 'Enable Auto Transition',
            listeners: {
            	change: function(cb, nv, ov){
            		if(nv){
            			Options.auto.pause.enable();
            			Options.auto.autoStart.enable();
            			Options.auto.direction.enable();
            		}else{            			
            			Options.auto.pause.disable();
            			Options.auto.autoStart.disable();
            			Options.auto.direction.disable();
            		}
            	},
            	render: function(){
            		if(this.value){
            			Options.auto.pause.enable();
            			Options.auto.autoStart.enable();
            			Options.auto.direction.enable();
            		}else{            			
            			Options.auto.pause.disable();
            			Options.auto.autoStart.disable();
            			Options.auto.direction.disable();
            		}
            	}
            }
        }),
        pause : Ext.create('Ext.form.field.Number', {
            name: 'pause',
            fieldLabel: 'Pause',
            minValue: 500
        }),  
    	autoStart : Ext.create('Ext.form.field.Checkbox', {
            name: 'autoStart',
            value: 'true',
            fieldLabel: 'Auto Start'
        }),
        direction : Ext.create('Ext.form.field.ComboBox', {
            name: 'autoDirection',
            fieldLabel: 'Auto Direction',
            store: [
    			[
    				"next",
    				"Forward"
    			],
    			[
    				"prev",
    				"Back"
    			]
    		]
        })
    },
    carousel : {
    	minSlides : Ext.create('Ext.form.field.Number', {
            name: 'minSlides',
            fieldLabel: 'Min Slides',
            listeners: {
            	change: function(cb, nv, ov){
            		if(nv > 1){
            			Options.carousel.slideWidth.enable();
            			Options.carousel.moveSlides.enable();
            		}else if(Options.carousel.maxSlides.value <= 1){            			
            			Options.carousel.slideWidth.disable();
            			Options.carousel.moveSlides.disable();
            		}
            	},
            	render: function(){
            		if(this.value){
            			Options.carousel.slideWidth.enable();
            			Options.carousel.moveSlides.enable();
            		}else if(Options.carousel.maxSlides.value <= 1){            			
            			Options.carousel.slideWidth.disable();
            			Options.carousel.moveSlides.disable();
            		}
            	}
            },
            minValue: 1
        }),
        maxSlides : Ext.create('Ext.form.field.Number', {
            name: 'maxSlides',
            fieldLabel: 'Max Slides',
            listeners: {
            	change: function(cb, nv, ov){
            		if(nv > 1){
            			Options.carousel.slideWidth.enable();
            			Options.carousel.moveSlides.enable();
            		}else if(Options.carousel.minSlides.value <= 1){            			
            			Options.carousel.slideWidth.disable();
            			Options.carousel.moveSlides.disable();
            		}
            	},
            	render: function(){
            		if(this.value){
            			Options.carousel.slideWidth.enable();
            			Options.carousel.moveSlides.enable();
            		}else if(Options.carousel.minSlides.value <= 1){            			
            			Options.carousel.slideWidth.disable();
            			Options.carousel.moveSlides.disable();
            		}
            	}
            },
            minValue: 1         
        }),
        slideWidth : Ext.create('Ext.form.field.Number', {
            name: 'slideWidth',
            fieldLabel: 'Slide Width',
            minValue: 1
        }),
        moveSlides : Ext.create('Ext.form.field.Number', {
            name: 'moveSlides',
            fieldLabel: 'Move Slides',
            minValue: 1
        })
    }
};

window.Options = Options;


Ext.widget({
    xtype:'mz-form-widget',
    items: [
		slideGrid,
		slideValue,
		{
			xtype: 'form',
			title: "Settings",			
			collapsible: true,
			collapsed: true,
			margin: '25 0 0 0',
			layout: {
				type: 'vbox',
				align: 'left'
			},
			items: [
				{
					xtype: 'fieldcontainer',
					label: 'General',
					layout: 'hbox',
					items: [
						{
							xtype: 'fieldcontainer',
							layout: 'vbox',
							margin: '0 10 0 0',
							items: [
								Options.general.mode,
								Options.general.speed,
								Options.general.infiniteLoop,
								Options.general.randomStart,
								Options.general.startSlide,
								Options.general.captions
							]
						},
						{
							xtype: 'fieldcontainer',
							layout: 'vbox',
							margin: '0 10 0 0',
							items: [
								Options.pager.enabled,
								Options.pager.pagerType,
								Options.pager.pagerShortSeparator,
								Options.controls.enabled,
								Options.controls.autoControls,
								Options.controls.autoControlsCombine
							]
						},
						{
							xtype: 'fieldcontainer',
							layout: 'vbox',
							margin: '0 10 0 0',
							items: [
								Options.auto.enabled,
								Options.auto.pause,
								Options.auto.autoStart,
								Options.auto.direction,
								Options.general.wrapperClass,
								Options.general.cssInclude					
							]
						},
						{
							xtype: 'fieldcontainer',
							layout: 'vbox',
							margin: '0 0 0 0',
							hidden: true,
							disabled: true,
							items: [
								Options.carousel.minSlides,
								Options.carousel.maxSlides,
								Options.carousel.slideWidth,
								Options.carousel.moveSlides					
							]
						}
					]
				
				}
			
			
			]
		}
	]
});



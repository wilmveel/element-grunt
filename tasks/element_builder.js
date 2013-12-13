/*
 * element-builder
 * https://github.com/wilmveel/grunt-element-builder
 *
 * Copyright (c) 2013 Willem Veelenturf
 * Licensed under the MIT license.
 */

'use strict';

var request = require('request');
var fs = require('fs');
var $ = require('jquery');
var async = require('async');

var options;

module.exports = function(grunt) {

	// Please see the Grunt documentation for more information regarding task
	// creation: http://gruntjs.com/creating-tasks

	grunt.registerMultiTask('element_builder', 'Plugin to convert ui definitions in json to html', function() {

		var done = this.async();
	  
		// Merge task-specific and/or target-specific options with these defaults.
		options = this.options({
		});

		// Iterate over all specified file groups.
		this.files.forEach(function(f) {

			// Concat banner + specified files + footer.
			var src = f.src.filter(function(filepath) {
				// Warn on and remove invalid source files (if nonull was set).
				if (!grunt.file.exists(filepath)) {
					grunt.log.warn('Source file "' + filepath + '" not found.');
					return false;
				} else {
					grunt.log.writeln('Source file "' + filepath + '" found.');

					var elements = grunt.file.readJSON(filepath);			
					async.map(elements, function(item, callback){
						loadElement (item, callback);
					}, function(err, result){

						var html = "";
						result.forEach(function(item){
							html += item;
						});

						console.log("Html" + html);
						
						fs.writeFile("partials/test.html", html, function(err) {
							if(err) {
								console.log(err);
							} else {
								console.log("The file was saved!");
							}
						}); 
					});
				}
			});
		});
	});
		
		
	function loadElement (element, callback){
		
		// Build url base on options
		var url = "";
		url = options.url;
		if(options.version){
		url += "/" + options.version
		}
	
		url += "/" + element.template + ".html";
		//console.error("Url: ", url); //show loaded urls
		
		request(url, function (error, response, data) {
			//console.log("Data ", data);
			
			var template = data;
			template = injectData(template, element);
			//template = $(template);
			//console.log("Template ", template[0].outerHTML);
			
			if(element.elements){
				async.map(element.elements, function(item, callback){
					loadElement (item, callback);
				}, function(err, result){

					var child = "";
					result.forEach(function(item){
						child += item;
					});
					//console.log("Child: ", child, "{Hall0}" + template.prop('outerHTML') + "{Hallo}");
					template.find('element-include').replaceWith(child);
					callback(null, template.prop('outerHTML'));
				});
			}else{
				callback(null, template.prop('outerHTML'));
			}	
		})
	}
	
	function injectData(template, element){
		
		// replace data variables
		template = template.replace('{{id}}', element.id);
		template = template.replace('{{name}}', element.name);
		for (var key in element.data) {
			if (element.data.hasOwnProperty(key)) {
				template = template.replace('{{data.' + key + '}}', element.data[key]);
				//console.log("Data: " + key) // Display data
			}
		}
		
		// inject angular variables
		template = $(template);
		if(element.angular){
			template.find("[ng-bind]").attr("ng-bind", element.angular.bind);
			template.find("[ng-model]").attr("ng-model", element.angular.model);
			template.find("[ng-click]").attr("ng-click", element.angular.click);
		}
		
		// inject validation variables
		if(element.validation){
			$.each(element.validation, function(key, value){
				//console.log("Add validator preview", value, key);
				key = key.replace(/[A-Z]/g, function(ch){return "-" + ch.toLowerCase()});
				if(value.value){
					template.find("[element-validate]").attr(key, value.value);
				}else{
					template.find("[element-validate]").attr(key, true);
				}
			});
			template.find("[element-validate]").removeAttr("element-validate");
		}

		return template;
	}
};
/*
rssFeedScript.js
By Robert M Mettetal for CSE322 - Dr. David Turner - Fall 2015
mettetar@coyote.csusb.edu
Copyright 2015 - All Rights Reserved
------------------------------------

This was tested with a few NASA feeds, but should work with most feeds that abide by the RSS standard
This script needs jQuery and a server-side php script to complete the get request

This script will look for page elements named: feedSelect, feedChoice, and rss-panel
feedSelect is the onclick event sender (the 'Go' button)
feedChoice.value must contain the feed URL (a dropdown menu such as <select> with various <option>'s that set the feed url to 'value')
rss-panel will receieve the rendered feed to it's innerHTML

Styling is provided with the following css class and ID's:
--Class: 
rss-items           (news items <div>)

--ID: 
rss-items-evens     (news items <div>) - evens vs odds handy for alternate formatting such as background color
rss-items-odds 

rss-channelDescrip  (channel description <em> tag)
rss-item-container  (news items container div- will have at least the news item description and a link to the article - can also contain the article image)
rss-itemImg         (news item image div)
rss-itemDescrip     (news item discription div)

*/

(function() {
  var httpRequest;
  
  //initial setup - assign event listeners and configure request dispatch
  document.getElementById("feedSelect").onclick = function() {
    document.getElementById("rss-panel").innerHTML = '';
    //console.log(document.getElementById("feedChoice").value);
    if(!setupRequest('POST','nasaRSS.php')) {
        alert('Error in request setup');
        return;
    }
    httpRequest.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    httpRequest.send('feedUrl=' + encodeURIComponent(document.getElementById("feedChoice").value));
  }
  
  //CORS Request - generic setup function
  function setupRequest(type, url) {
    httpRequest = new XMLHttpRequest();
    if (!httpRequest) {
        alert('Error: Cannot create an XMLHTTP instance');
        return false;
    } else if ("withCredentials" in httpRequest) {              //Verify CORS support by the presence of credentials
        httpRequest.open(type,url);
        httpRequest.onreadystatechange = responseHandler;
        //console.log("HTML5 CORS used");
        return true;
    } else if(typeof XDomainRequest != "undefined") {
        httpRequest = new XDomainRequest();                     //IE support
        httpRequest.open(type,url);
        httpRequest.onreadystatechange = responseHandler;
        //console.log("IE XDomainRequest used");
        return true;
    }
    alert('Error: Cross-Domain Request not supported by browser');
    //console.log("ERROR: CORS and XDomainRequest not supported")
    return false;
    //example default codepath, before above CORS checks were added
    //httpRequest.open(type,url);
    //httpRequest.onreadystatechange = responseHandler;
    //return true;
  };
  
  //response listener - handles returned request, dispatches RSS builder
  function responseHandler() {
    if (httpRequest.readyState === XMLHttpRequest.DONE) {
      if (httpRequest.status === 200) {
        buildRssHTML(httpRequest.responseText);
      }
      else {
        alert('There was a problem with the feed request.');
            //console.log(httpRequest.responseText);            //for debug
        }
      }
  }
  
  //rss builder function - expects the respText to be XML RSS - this input will be parsed to XML DOM
  function buildRssHTML(respText) {
    //some bools to disable certain item elements from being shown
    var showChannelTitle = true;
    var showChannelDescrip = true;
    var showChannelImg = true;
    var showItemImg = true;
    //the maximum number of news items to process
    var maxNewsItems = 25;
    
    //grab a reference to the rss result panel - the rendered RSS will go here
    var resultPanel = document.getElementById('rss-panel');
    
    //Use jQuery to parse the RSS XML into a document object
    var parsed = jQuery.parseXML(respText);
    
    //check for problems parsing
    if(!parsed) {
      resultPanel.innerHTML = resultPanel.innerHTML.concat('<p>Error parsing response </p>');
      return;
    }
    
    // var parsedObj = jQuery.parseXML(respText);
    // console.log('parsed obj follows');
    // console.log(parsedObj);
    // console.log('parsed DOM follows');
    // console.log(parsed);
    
    //grab a reference to the nested channel DOM object
    var feed = parsed.getElementsByTagName('channel');
    //check for problems grabbing the channel element
    if(feed) {
      resultPanel.innerHTML = resultPanel.innerHTML.concat('<p>Feed Detected! </p>');
      console.log(feed);
    }
    else {
      resultPanel.innerHTML = resultPanel.innerHTML.concat('<p>Error detecting feed </p>');
      return;
    }
    
    //grab a reference to the child-items of the channel object
    var channelItems = feed.item(0).children;           //older browsers seem to trip up here, this returns null breaking everything that follows
    //check for problem getting channel children
    try {
      if(!channelItems.length);
    }
    catch(err) {                           //note: it seems IE doesnt support 'children' properly, need to use childNodes
      //alternate path to get the child elements of the channel
      //console.log("channel node not retreieved properly, trying alternate...");
      channelItems = feed.item(0).childNodes;
      //console.log(channelItems);
    }
    //some debug to help with diagnosing the child properties in the channel
    //console.log("channelItems follows: length=" + channelItems.length);
    //console.log(channelItems);
    
    //setup some variables to use for building the news elements
    var channelPrep = {};   //this var will hold the channel properties as they are prepared
    var imgPrep = {}        //this var will hold the channel image properties
    var itemsPrep = [];     //this array will hold the news items as they are prepared sequentially
    var xmlStringer = new XMLSerializer();      //this object can extract the raw plaintext of some XML, used to work-around grabbing element data in older browsers
    var itemCount = 0;
    
    
    //start main feed processing loop - all child elements of the channel object will be examined in this loop
    for(var i = 0; i < channelItems.length && itemCount < maxNewsItems; i++) {      
      //channel title check
      if(channelItems.item(i).nodeName == 'title' && showChannelTitle) {
        //if the title name was detected, but no innerHTML was properly parsed we will use an alternate method
        if(!channelItems.item(i).innerHTML) {
          //serialize the XML to plaintext
          channelPrep.title = xmlStringer.serializeToString(channelItems.item(i));
          //remove the tag
          channelPrep.title = channelPrep.title.replace("<title>", "").replace("</title>", "");
        }
        else {
          //for modern browsers, the innerHTML can be grabbed directly
          channelPrep.title = channelItems.item(i).innerHTML;
        }
      }
      
      //channel description check
      if(channelItems.item(i).nodeName == 'description' && showChannelDescrip) {
        //check for innerHTML detection, similar to the title check above
        if(!channelItems.item(i).innerHTML) {
          channelPrep.descrip = xmlStringer.serializeToString(channelItems.item(i));
          channelPrep.descrip = channelPrep.descrip.replace("<description>", "").replace("</description>", "");
          channelPrep.descripHTML = '<h2><em id="rss-channelDescrip">' + channelPrep.descrip + '</em></h2>';
        }
        else {
          channelPrep.descripHTML = '<h2><em id="rss-channelDescrip">' + channelItems.item(i).innerHTML + '</em></h2>';
        }
        
      }
      //channel image check
      if(channelItems.item(i).nodeName == 'image' && showChannelImg) {
        var channelImgProps = channelItems.item(i).children;
        //another check for proper detection of child elements
        try {
          if(!channelImgProps.length);
        }
        catch(err) {
          //console.log("Error retrieving children nodes... trying alternate");
          channelImgProps = channelItems.item(i).childNodes;
        }
        //code needed to grab URL property only in the instance where innerHTML was not detected
        //the following will only work in proper detection, image will show undefined if not detected
        for(var j = 0; j < channelImgProps.length; j++) {
          if(channelImgProps.item(j).nodeName == 'title') {
            imgPrep.title = channelImgProps.item(j).innerHTML;
          }
          if(channelImgProps.item(j).nodeName == 'width') {
            imgPrep.width = channelImgProps.item(j).innerHTML;
          }
          if(channelImgProps.item(j).nodeName == 'height') {
            imgPrep.height = channelImgProps.item(j).innerHTML;
          }
          if(channelImgProps.item(j).nodeName == 'link') {
            imgPrep.link = channelImgProps.item(j).innerHTML;
          }
          if(channelImgProps.item(j).nodeName == 'url') {
            imgPrep.url = channelImgProps.item(j).innerHTML;
          }
        } //end of descrip-image loop
      }
      
      //news item check - this will process the actual news items
      
    if(channelItems.item(i).nodeName == 'item') {
        var channelItemProps = channelItems.item(i).children;
        //another check for child elements
        try {
          if(!channelItemProps.length);
        }
        catch(err) {
          //alternate path for detection
          //console.log("Error retrieving children nodes... trying alternate");     //alternate method for IE support
          channelItemProps = channelItems.item(i).childNodes;
        }
        //prepare an item object to grab the news item properties
        //flag for only pushing items that were properly detected
        var item = {};
        var flag = false;
        
        //loop through the child elements of the news item
        for(var j = 0; j < channelItemProps.length; j++) {
          ////special block for old browser parse support - if the innerHTML is not detected, then string the raw XML and remove the tags manually
          if(!channelItemProps.item(j).innerHTML) {
            //console.log("Item HTML not detected, trying alternate...");
            if(channelItemProps.item(j).nodeName == 'title') {
                item.title = xmlStringer.serializeToString(channelItemProps.item(j));
                item.title = item.title.replace("<![CDATA[", "").replace("]]>", "");      //clear out any char-data tags - these were used to keep the XML parser from getting confused
                item.title = item.title.replace("RISERVA__", "");
                item.title = item.title.replace("<title>", "").replace("</title>", "");
                flag = true;
            }
            if(channelItemProps.item(j).nodeName == 'description') {
                item.descrip = xmlStringer.serializeToString(channelItemProps.item(j));
                item.descrip = item.descrip.replace("<![CDATA[", "").replace("]]>", "");
                item.descrip = item.descrip.replace("<description>", "").replace("</description>", "");
                flag = true;
            }
            if(channelItemProps.item(j).nodeName == 'link') {
                item.link = xmlStringer.serializeToString(channelItemProps.item(j));
                item.link = item.link.replace("<link>", "").replace("</link>", "");
                item.link = item.link.replace("<![CDATA[", "").replace("]]>", "");
                flag = true;
            }
            if(channelItemProps.item(j).nodeName == 'enclosure') {
                
                if(channelItemProps.item(j).hasAttribute('type')) {
                    var type = channelItemProps.item(j).getAttribute('type');
                    var patt = /image.*/ig;
                    if(  patt.test( type ) ) {                                                      //channelItemProps.item(j).getAttribute('type') =="img/.*"
                        if(channelItemProps.item(j).hasAttribute('url')){
                            item.imageURL = channelItemProps.item(j).getAttribute('url');
                            
                        }
                        
                    }
                }
            }
            
          } //end of special case
          else {
            //console.log("Using innerHTML path");
            //general case for pulling the news item properties
            //any formatting code is removed (CDATA tags used to signal the intrepeter that code-specific key characters may be present in the string)
            if(channelItemProps.item(j).nodeName == 'title') {
              item.title = channelItemProps.item(j).innerHTML;
              item.title = item.title.replace("<![CDATA[", "").replace("]]>", "");
              item.title = item.title.replace("RISERVA__", ""); 
              flag = true;
            }
            if(channelItemProps.item(j).nodeName == 'description') {
                //console.log("in description")
                item.descrip = xmlStringer.serializeToString(channelItemProps.item(j));
                
                item.descrip = item.descrip.replace("<![CDATA[", "").replace("]]>", "");
                
                item.descrip = item.descrip.replace("<description>", "").replace("</description>", "");
                
                item.descrip = item.descrip.replace(/&lt;/g," <").replace(/&gt;/g,"> ");    //tag chars were converted to &lt &gt codes, so this turns them back
                
                var grabRawImg = item.descrip.match(/<img (.*?)>/);             //sometimes the news item description contains nested img tags, we will try to pull only the first match here
                
                if(grabRawImg) {
                    var rawURL = grabRawImg[1].match(/src="(.*?)"/);            //this tries to pull the source URL for the matched img tag
                    if(rawURL) {
                      item.imageURL = rawURL[1];                                  //if the source was found, set the item imageURL
                      item.descrip = item.descrip.replace(/<img (.*?)>/g,'');     //and remove all other image tags 
                    }
                }
                //console.log(item.descrip);
                item.descrip = item.descrip.replace(/\u00A0+/g,'<br> <br>');
                
                flag = true;
            }
            if(channelItemProps.item(j).nodeName == 'link') {
              item.link = channelItemProps.item(j).innerHTML;
              item.link = item.link.replace("<![CDATA[", "").replace("]]>", "");
              flag = true;
            }
            //enclosure tags can have an image, so we will attempt to grab these
            if(channelItemProps.item(j).nodeName == 'enclosure') {
                if(channelItemProps.item(j).hasAttribute('type')) {
                    if(channelItemProps.item(j).getAttribute('type') == 'img/jpeg') {
                        // console.log("enclosure img detected");
                        // console.log(channelItemProps.item(j));
                    }
                }
            }
        }
    }
    //end of items-child loop
    //if the item was flagged, push it to the prep array - these will be the rendered news items
    if(flag) {
        itemsPrep.push(item);
        itemCount++;
        }
    } 
      
    } //end of channel-child loop
    
    var itemsHTML = [];     //array to hold the final HTML strings as they are generated from the news item properties
    var place;              //place indicator used to denote odd/even news items - odds/evens will have an ID tag to reflect this and allow differing CSS styles
    //loop through the array of prepared items
    for(var i = 0; i < itemsPrep.length; i++) {
        place = (i%2==0) ? 'evens' : 'odds';      //set the current place - i%2 yields the remainder of a division by two. if result is zero, i is even, else it is odd
        //prepare the item HTML string
      
        if(itemsPrep[i].imageURL) {
            //console.log("Image URL found for HTML building");
            var itemHTML = '<hr>'
                         + '<div class="rss-items" id="rss-items-'+ place + '">'
                         +   '<h4>' + itemsPrep[i].title + '</h4>'
                         + '<div id="rss-item-container">'
                         +  '<div id="rss-itemImg">'
                         +   '<a href="' + itemsPrep[i].imageURL + '" target="_blank">'
                         +   '<img src="'+ itemsPrep[i].imageURL + '" > </td>'
                         +   '</a>'
                         +  '</div>'
                         + '<div id="rss-itemDescrip">'
                         + '<p>' + itemsPrep[i].descrip + '</p>'
                         + '<a href="'+ itemsPrep[i].link +'" target="_blank">Go to article...</a>'
                         + '</div>'
                         + '</div>'
                         + '</div>';
            itemsHTML.push(itemHTML);   //push the prepared HTML to the array
        }
        else {
            var itemHTML = '<hr>'
                         + '<div class="rss-items" id="rss-items-'+ place + '">' 
                         +   '<h4>' + itemsPrep[i].title + '</h4>'
                         + itemsPrep[i].descrip
                         + '<br><a href="'+ itemsPrep[i].link +'" target="_blank">Go to article...</a>'
                         + '</div>';
            itemsHTML.push(itemHTML);   //push the prepared HTML to the array
        }
    }
    //prepare the news feed header
    //a check here to see if the channel image should be shown
    if(showChannelImg && imgPrep.link) {
      //prepare the imageHTML string
      channelPrep.imageHTML = '<a href="'+ imgPrep.link + '">'  + '<img id="rss-ChannelImg" ' + ' src=" ' + imgPrep.url +' " ' +'>' + '</a>';
      //with the above image string and the prepared description HTML, generate the final head HTML string
      var headHTML = '<table id="rss-descripTable"> ' 
                      + '<tr>'
                        + '<td>'
                            + channelPrep.imageHTML
                        + '</td>'
                        + '<td>'
                            + channelPrep.descripHTML
                        + '</td>'
                      + '</tr>'
                    + '</table>';
    }
    else {
      //image-free description
      var headHTML = '<table id="rss-descripTable"> ' 
                      + '<tr>'
                        + '<td>'
                        + channelPrep.descripHTML
                        + '</td>'
                      + '</tr>'
                    + '</table>';
    }
    //concat the feed header to the result HTML
    resultPanel.innerHTML = resultPanel.innerHTML.concat(headHTML);
    //loop through the news items and concat them to the result HTML
    for(var i = 0; i < itemsHTML.length; i++ ) {
      resultPanel.innerHTML = resultPanel.innerHTML.concat(itemsHTML[i]);
    }
  }     //end of buildRssHTML - all done!
})(); //end of script
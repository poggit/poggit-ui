/*
 * Copyright 2016-2018 Poggit
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

$(function() {
    const createSectionName = (context, ref) => `${context}-section-${ref}`;
    const createAnchorName = (context, name) => `${context}-anchor-${name}`;

    function fixMarkdownLinks($content) {
        const LINK_TYPE_PROTOCOL = 1;
        const LINK_TYPE_DOMAIN = 2;
        const LINK_TYPE_PATH = 3;
        const LINK_TYPE_NAME = 4;
        const LINK_TYPE_ANCHOR = 5;

        function getLinkType(link) {
            if(/^https?:\/\//i.test(link)) return LINK_TYPE_PROTOCOL;
            if(link.startsWith("//")) return LINK_TYPE_DOMAIN;
            if(link.charAt(0) === "/") return LINK_TYPE_PATH;
            if(link.charAt(0) !== "#") return LINK_TYPE_NAME;
            return LINK_TYPE_ANCHOR;
        }

        const contentId = $content.attr("id");
        const sectionAnchors = []; // anchors generated by GitHub at headers
        $content.find("a.anchor").each(function() { // anchors generated by GitHub
            const $this = $(this).addClass("dynamic-anchor").html("&sect;");
            const $parent = $this.parent(); // an h[1-6] element
            $this.appendTo($parent); // moves element behind the header
            const baseAnchor = this.id.substring("user-content-".length);
            sectionAnchors.push(baseAnchor);
            const anchorName = createSectionName(contentId, baseAnchor);
            $parent.attr("data-base-anchor", baseAnchor);
            $this.addClass("processed-section-anchor")
                .attr("id", anchorName).attr("href", "#" + anchorName)
                .removeAttr("aria-hidden");
            dynamicAnchor.call(this);
        });
        const userAnchors = [];
        const processCustomAnchor = (attr) => function() {
            var $this = $(this);
            const name = this[attr].substring("user-content-".length);
            userAnchors.push(name);
            $this.addClass("processed-custom-anchor").attr("id", createAnchorName(contentId, name));
        };
        $content.find("a[name^='user-content-']").each(processCustomAnchor("name"));
        $content.find("[id^='user-content-']").each(processCustomAnchor("id"));
        const hrefProcess = function(atributeName) {
            return function() {
                var $this = $(this);
                var link = $this.attr(atributeName); // raw href, not the browser-parsed full href
                switch(getLinkType(link)) {
                    case LINK_TYPE_ANCHOR:
                        if(link.startsWith("#poggit-")) {
                            // special prefix, e.g. if you want to link #license, you have to write #poggit-license instead
                            $this.attr(atributeName, "#" + link.substring("#poggit-".length));
                        } else {
                            let name = link.substring(1);
                            if(name.startsWith("user-content-")) {
                                // GitHub does not prepend user-content- to internal anchor links, but some users might do this on purpose.
                                name = name.substring("user-content-".length);
                            }
                            if(sectionAnchors.indexOf(name) !== -1) {
                                $this.addClass("section-reference").attr(atributeName, "#" + createSectionName(contentId, name));
                            } else if(userAnchors.indexOf(name) !== -1) {
                                $this.addClass("anchor-reference").attr(atributeName, "#" + createAnchorName(contentId, name));
                            }
                        }
                        break;
                    case LINK_TYPE_NAME:
                        $this.attr(atributeName, `https://github.com/${releaseDetails.project.repo.owner}/${releaseDetails.project.repo.name}/blob/${releaseDetails.build.tree}${link}`);
                        break;
                    case LINK_TYPE_PATH:
                        $this.attr(atributeName, "https://github.com" + link);
                        break;
                    case LINK_TYPE_DOMAIN:
                        $this.attr(atributeName, "https:" + link);
                        break;
                }
            }
        };
        $content.find("a[href]").each(hrefProcess("href"));
        $content.find("img[src]").each(hrefProcess("src"));
    }

    function tabularize(tags, $contents, requiredHeaders, isHorizontal, containerId) {
        // Remove GitHub markdown headers (added around early 2024 and breaks this parser)
        $('[class^="markdown-heading"]').replaceWith(function() {
            for(let i = 0; i < tags.length; ++i) {
                if($(this).children(tags[i]).length > 0) {
                    //move the a.anchor into the h tag
                    $(this).children("a.anchor").appendTo($(this).children(tags[i]).first());
                }
            }
            return $(this).html();
        });

        // choose delimiter
        let delimiter = null, delimiterId;
        for(let i = 0; i < tags.length; ++i) {
            if($contents.children(tags[i]).length >= requiredHeaders) {
                delimiter = tags[i];
                delimiterId = i;
                break;
            }
        }
        if(delimiter === null) return "The description has less than " + requiredHeaders + " headers.";

        // load titles
        const ids = [createSectionName(containerId, "general")];
        const titles = ["General"];
        $contents.children(delimiter).each(function() {
            const $this = $(this);
            $this.children("a.anchor.dynamic-anchor").remove();
            let myId = $this.attr("data-base-anchor");
            if(!myId) myId = String(Math.random());
            const id = createSectionName(containerId, myId);
            ids.push(id);
            titles.push($this.text());
        });
        // init tabs
        const tabs = Array(titles.length);
        for(let i = 0; i < ids.length; ++i) {
            tabs[i] = $("<div class='release-description-tab-content'></div>")
                .attr("id", ids[i])
                .addClass(isHorizontal ? "release-description-tab-horizontal" : "release-description-tab-vertical");
        }

        const anchors = {};
        for(let i = 0; i < ids.length; ++i) {
            anchors[ids[i]] = i;
        }
        // move elements into tabs
        let i = 0;
        $contents.contents().each(function() {
            if(this instanceof HTMLHeadingElement && this.tagName.toLowerCase() === delimiter) {
                ++i;
            } else {
                // assume tabs[i] exists
                const $this = $(this);
                tabs[i].append(this);
                if($this.hasClass("processed-custom-anchor")) {
                    anchors[this.id] = i;
                } else if(this instanceof HTMLHeadingElement) {
                    anchors[$this.find(".dynamic-anchor").attr("id")] = i;
                }
                $this.find(".processed-custom-anchor").each(function() {
                    // noinspection JSPotentiallyInvalidUsageOfThis
                    anchors[this.id] = i;
                });
            }
        });
        const skipGeneral = tabs[0].children().length === 0;
        // write titles
        const titleTabs = $("<ul></ul>");
        for(let i = 0; i < ids.length; ++i) {
            if(skipGeneral && i === 0) continue;
            titleTabs.append($("<li></li>").append($("<a></a>")
                .attr("href", "#" + ids[i])
                .text(titles[i].substr(0, 35) + (titles[i].length > 35 ? "..." : ""))));
        }

        const result = $("<div></div>").attr("id", (isHorizontal ? "release-description-container" : "release-description-container-vertical")).append(titleTabs);
        for(let i = 0; i < ids.length; ++i) {
            if(skipGeneral && i === 0) continue;
            if(isHorizontal) tabularize(tags.slice(delimiterId + 1), tabs[i], 4, false, containerId);
            result.append(tabs[i]);
        }
        result.tabs({orientation: isHorizontal ? "horizontal" : "vertical"});
        $contents.html("").append(result);

        // add page changer to internal links
        for(let i = 0; i < ids.length; ++i) {
            tabs[i].find("a.section-reference, a.anchor-reference").click(function() {
                const id = $(this).attr("href").substring(1);
                if(anchors[id] !== undefined) {
                    result.tabs("option", "active", anchors[id]);
                    $("html, body").animate({
                        scrollTop: document.getElementById(id).offsetTop
                    }, 500)
                }
            });
        }

        return null;
    }

    function initDialogs() {
        $("#how-to-install").dialog({
            autoOpen: false,
            modal: true,
            position: modalPosition,
            open: function(event, ui) {
                $('.ui-widget-overlay').bind('click', function() {
                    $("#how-to-install").dialog('close');
                });
            }
        });

        $("#release-description-bad-dialog").dialog({
            autoOpen: false,
            position: modalPosition
        });

        $("#license-dialog").dialog({
            position: modalPosition,
            modal: true,
            height: window.innerHeight * 0.8,
            width: window.innerWidth * 0.8,
            autoOpen: false,
            open: function(event, ui) {
                $('.ui-widget-overlay').bind('click', function() {
                    $("#license-dialog").dialog('close');
                });
            }
        });
    }

    initDialogs();

    ghApi("users/" + $("#release-authors").attr("data-owner"), {}, "GET", function(data) {
        if(data.type === "User") {
            var ownerLi = $("<li class='release-authors-entry'></li>")
                .append($("<img/>")
                    .attr("src", data.avatar_url)
                    .attr("width", "16"))
                .append(" @" + data.login)
                .append(generateGhLink(data.html_url));
            var li = $("<li>Owner</li>")
                .append($("<ul class='plugin-info release-authors-sub'></ul>")
                    .append(ownerLi));
            li.prependTo($("#release-authors-main"));
        }
    });

    if(!releaseDetails.isMine) {
        var reviewDialog, reviewForm;

        // REVIEWING
        function doAddReview() {
            // var criteria = $("#review-criteria").val();
            var criteria = 0;
            var type = sessionData.session.adminLevel >= PoggitConsts.AdminLevel.MODERATOR ? 1 : 2;
            var cat = releaseDetails.mainCategory;
            var score = $("#votes").val();
            var message = $("#review-message").val();

            if(score < 5) {
                for(const substr in ["outdate", "update", "alpha", "3.0.0"]) {
                    if(message.toLowerCase().indexOf(substr) !== -1) {
                        if(!confirm("You may not review an old plugin negatively just because it doesn't support the API version you use. Moderation action may be carried out if you do so. Are you sure you still want to submit this review?")) {
                            return true;
                        }
                        break;
                    }
                }
            }

            addReview(releaseDetails.releaseId, criteria, type, cat, score, message);

            reviewDialog.dialog("close");
            return true;
        }

        function addReview(relId, criteria, type, cat, score, message) {
            ajax("review.admin", {
                data: {
                    relId: relId,
                    criteria: criteria,
                    type: type,
                    category: cat,
                    score: score,
                    message: message,
                    action: "add"
                },
                method: "POST",
                success: function() {
                    location.replace(getRelativeRootPath() + `p/${releaseDetails.name}/${releaseDetails.version}`);
                },
                error: function() {
                    location.replace(getRelativeRootPath() + `p/${releaseDetails.name}/${releaseDetails.version}`);
                }
            });
        }

        reviewDialog = $("#review-dialog").dialog({
            title: "Poggit Review",
            autoOpen: false,
            position: modalPosition,
            modal: true,
            buttons: {
                Cancel: function() {
                    reviewDialog.dialog("close");
                },
                "Post Review": doAddReview
            },
            open: function() {
                $('.ui-widget-overlay').bind('click', function() {
                    reviewDialog.dialog('close');
                });
            },
            close: function() {
                reviewForm[0].reset();
            }
        });
        const reviewWarning = $("#review-warning");
        const reviewMessage = reviewDialog.find("#review-message");
        const outdatedTest = () => {
            if(reviewMessage.val().toLocaleLowerCase().indexOf("outdate") !== -1) {
                reviewWarning.text("Warning: Do not post negative reviews just because a plugin is outdated. Such reviews will be deleted.");
            } else {
                reviewWarning.text("");
            }
        };
        reviewMessage.change(outdatedTest).keyup(outdatedTest);

        reviewForm = reviewDialog.find("form").on("submit", function(event) {
            event.preventDefault();
        });

        var reviewIntent = $(".release-review-intent");
        var reviewIntentImages = reviewIntent.find("> img");
        reviewIntent.hover(function() {
            var score = this.getAttribute("data-score");
            reviewIntent.each(function() {
                // noinspection JSPotentiallyInvalidUsageOfThis
                if(this.getAttribute("data-score") <= score) {
                    $(this).find("> img").attr("src", getRelativeRootPath() + "res/Full_Star_Yellow.svg");
                }
            });
        }, function() {
            reviewIntentImages.attr("src", getRelativeRootPath() + "res/Empty_Star.svg");
        }).click(function() {
            $("#votes").val(this.getAttribute("data-score"));
            reviewDialog.dialog("open");
        });
    }

    const desc = $("#rdesc"), chLog = $("#rchlog");
    fixMarkdownLinks(desc);
    fixMarkdownLinks(chLog);

    if(sessionData.opts.makeTabs !== false) {
        var notabs = getParameterByName("notabs", null) !== null;
        if(notabs) {
            $(".release-description").append($("<span class='colored-bullet yellow'></span>")
                .css("cursor", "pointer")
                .click(function() {
                    window.location = window.location.origin + window.location.pathname;
                })
                .attr("title", "Click to display description in tabs."));
            return;
        }

        let error = null;
        if(desc.attr("data-desc-type") !== "html") {
            error = "The plugin description is not in markdown format.";
        } else {
            error = tabularize(["h1", "h2", "h3", "h4", "h5", "h6"], desc, 2, true, desc.attr("id"));
        }
        if(error !== null) {
            $("#release-description-bad-reason").html(error);
            $(".release-description").append($("<span class='colored-bullet red'></span>")
                .css("cursor", "pointer")
                // .click(function() {
                //     dialog.dialog("open");
                // })
                .attr("title", "Failed to display description in tabs: " + error));
        } else {
            $(".release-description").append($("<span class='colored-bullet green'></span>")
                .css("cursor", "pointer")
                .click(function() {
                    window.location = window.location.origin + window.location.pathname + "?notabs";
                })
                .attr("title", "Click to display description directly without splitting into tabs."));
        }
    }

    var disabled = [];
    let i = 0;
    chLog.children("ul").children("li").each(function() {
        if(this.hasAttribute("data-disabled")) {
            disabled.push(i);
        }
        i++;
    });
    chLog.tabs({
        disabled: disabled
    });

    $(".delete-release").click(function() {
        var modalPosition = {my: "center top", at: "center top+100", of: window};
        $("#dialog-confirm").dialog({
            resizable: false,
            height: "auto",
            width: 400,
            position: modalPosition,
            clickOut: true,
            modal: true,

            buttons: {
                "Delete Forever": function() {
                    $(this).dialog("close");
                    ajax("release.statechange", {
                        data: {
                            relId: releaseDetails.releaseId,
                            action: "delete"
                        },
                        method: "POST",
                        success: function() {
                            location.replace(getRelativeRootPath() + `p/${releaseDetails.name}/${releaseDetails.version}`);
                        },
                        error: function() {
                            location.replace(getRelativeRootPath() + `p/${releaseDetails.name}/${releaseDetails.version}`);
                        }
                    });
                },
                Cancel: function() {
                    $(this).dialog("close");
                }
            },
            open: function(event, ui) {
                $('.ui-widget-overlay').bind('click', function() {
                    $("#dialog-confirm").dialog('close');
                });
            }
        });
    });

    (() => {
        $.ajax(getRelativeRootPath() + "try.plugin", {
            method: "GET",
            dataType: "json",
            success: endpoints => {
                const display = {
                    dialog: $("<div></div>"),
                    dialogSetups: $("<select></select>"),
                    dialogPlugins: $("<pre style='display: inline;'></pre>"),
                    dialogDescription: $("<h6></h6>"),
                    dialogPlayers: $("<pre style='display: inline;'></pre>"),
                    dialogDuration: $("<pre style='display: inline;'></pre>"),
                    dialogUrl: "",
                    setups: {},
                    init: false,
                    setInit: function() {
                        $('.try-plugin').css("paddingLeft", "10px").css("paddingTop", "5px")
                            .append($("<h6>Try plugin via:</h6>"));
                        this.dialog.append($("<div>Setup: </div>").append(this.dialogSetups));
                        this.dialog.append($("<br/><div></div>").append(this.dialogDescription));
                        this.dialog.append($("<br/><div>Plugins included: </div>").append(this.dialogPlugins))
                        this.dialog.append($("<div>Max Players: </div>").append(this.dialogPlayers));
                        this.dialog.append($("<div>Server Runtime: </div>").append(this.dialogDuration))
                        this.dialog.dialog({
                            title: "[NEW] Try Plugin, Available setups:",
                            autoOpen: false,
                            position: modalPosition,
                            width: window.innerWidth * 0.8,
                            modal: true,
                            buttons: {
                                'Test Now': () => {
                                    ga("send", "event", "Try.Plugin", this.dialogSetups.val(), releaseDetails.name+" "+releaseDetails.version)
                                    window.open(this.dialogUrl, "Test Plugin", "")
                                },
                                'Close': () => {
                                    this.dialog.dialog("close");
                                }
                            }
                        });
                        this.dialogSetups.change(() => {
                            const newVal = this.dialogSetups.val()
                            this.update(this.setups[newVal])
                        })
                        this.init = true
                    },
                    add: function(endpoint, setups) {
                        if(setups.length === 0) return;
                        if(!this.init){
                            this.setInit()
                            this.update(setups[0])
                        }
                        let id = 1;
                        for(const setup of setups){
                            uid = endpoint.name+"-"+id.toString()
                            this.setups[uid] = setup;
                            this.dialogSetups.append($(`<option value="`+uid+`" id="`+uid+`">`+uid+`</option>`))
                            id += 1;
                        }
                        // One image per host.
                        let img = $(`<img class="hover-title" id="`+uid+`" src="`+endpoint.icon+`" alt="`+endpoint.name+`" width="32px" height="32px">`)
                        img.click((e) => {
                            this.update(setups[0], endpoint.name+"-1");
                            this.dialog.dialog("open");
                        })
                        $('.try-plugin').append(img);
                    },
                    update: function(setup, uid = null){
                        this.dialogDescription.text(setup.description);
                        this.dialogPlayers.text(setup.players);
                        this.dialogPlugins.text(setup.plugins.join(", "));
                        this.dialogDuration.text(setup.duration.toString()+" seconds");
                        this.dialogUrl = setup.url;
                        if(uid !== null) this.dialogSetups.children('[value="' + uid + '"]').attr('selected','selected');
                    }
                }
                const {name, version} = releaseDetails
                for(const endpoint of endpoints) {
                    const xhr = new XMLHttpRequest()
                    xhr.addEventListener("load", function() {
                        if(this.status >= 200 && this.status < 300) {
                            display.add(endpoint, JSON.parse(this.responseText))
                        }
                    })
                    xhr.timeout = 5000
                    xhr.open("POST", endpoint.url)
                    xhr.setRequestHeader("Content-Type", "application/json")
                    xhr.setRequestHeader("Accept", "application/json")
                    xhr.send(JSON.stringify({"plugin": name, "version": version}))
                }
            }
        })
    })()

    if(window.location.hash === "#shield-template") {
        alert("Thank you for submitting your plugin! Please have a look at the shields here and add them to the README on your repo.");
        window.location.hash = "";
    }
});

// CONSTANTS //
// Development
var DEBUG = false;


// Goodreads
var API_KEY = "qCvKuMsKEaW9YZGxjVGT1w";
var REQUEST_URL_ISBN = "https://www.goodreads.com/book/isbn/";
var REQUEST_URL_TITLE = "https://www.goodreads.com/book/title.xml";
var TOTAL_STARS = 5;


// Store patterns
var AMAZON = "amazon.";
var AUDIBLE = "audible.";
var AUDIBLE_BOOK = "/pd/";
var AUDIBLE_IT = "audible.it";
var AUDIBLE_JP = "audible.co.jp";
var BOOK_DEPOSITORY = "Book Depository";
var GOOGLE_PLAY = "play.google.com/store/books";
var STRAND = "strandbooks.com";

var SupportedStores = {
	OTHER: 0,
	AMAZON: 1,
  AUDIBLE_IT: 2,
  AUDIBLE_JP: 3,
  AUDIBLE: 4,
	BOOK_DEPOSITORY: 5,
  GOOGLE_PLAY: 6,
  STRAND: 7
}



/// GLOBAL VARIABLES ///
var CurrentStore = 0;
var CanonicalURL = "";
var ASIN = "";
var Author = "";
var Title = "";



// MAIN //
checkStore();
setChangeObservers();
retrieveRating();
// injectRating(5.00, 218797, "https://www.goodreads.com/book/show/53732.Dune");



// FUNCTIONS //
// Retrieves the canonical URL to check and set the current store.
// Different stores store ASINs differently and require different styling.
function checkStore() {
	CanonicalURL = $("link[rel='canonical']").attr("href");

  if (CanonicalURL === undefined) {
    if (DEBUG) console.log("Unsupported store");
    return;
  } else if (CanonicalURL.indexOf(AMAZON) !== -1) {
		CurrentStore = SupportedStores.AMAZON;
    if (DEBUG) console.log("Store: Amazon");
  } else if (CanonicalURL.indexOf(AUDIBLE_IT) !== -1) {
		CurrentStore = SupportedStores.AUDIBLE_IT;
    if (DEBUG) console.log("Store: Audible Italy");
  } else if (CanonicalURL.indexOf(AUDIBLE_JP) !== -1) {
		CurrentStore = SupportedStores.AUDIBLE_JP;
    if (DEBUG) console.log("Store: Audible Japan");
	} else if (CanonicalURL.indexOf(AUDIBLE) !== -1) {
		CurrentStore = SupportedStores.AUDIBLE;
    if (DEBUG) console.log("Store: Audible");
	} else if ($("meta[name='author']").attr("content") === BOOK_DEPOSITORY) {
		CurrentStore = SupportedStores.BOOK_DEPOSITORY;
    if (DEBUG) console.log("Store: The Book Depository");
  } else if (CanonicalURL.indexOf(GOOGLE_PLAY) !== -1) {
		CurrentStore = SupportedStores.GOOGLE_PLAY;
    if (DEBUG) console.log("Store: Google Play");
  } else if (CanonicalURL.indexOf(STRAND) !== -1) {
		CurrentStore = SupportedStores.STRAND;
    if (DEBUG) console.log("Store: The Strand");
  }

  if (DEBUG) console.log("Canonical URL: " + CanonicalURL);
}


// Sets mutation observers for Google Play Store (where book content gets
// replaced, rather than reloaded).
function setChangeObservers() {
  if (CurrentStore === SupportedStores.GOOGLE_PLAY) {
    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    var observer = new MutationObserver(function(mutations, observer) {
      if (DEBUG) console.log("Google Play Store content changed");
      retrieveRating();
    });

    observer.observe($(".body-content")[0], {
      childList: true
    });
  }
}


// Tries to find the book's ASIN in the page.
// If ASIN is found, initiates an API request to Goodreads.
function retrieveRating() {
	switch (CurrentStore) {
		case SupportedStores.OTHER:
			break;

		case SupportedStores.AMAZON:
      ASIN = retrieveAmazonASIN();
      Author = $($("#byline a")[0]).text().trim();
      Title = $($("#title span")[0]).text().trim();
			break;

    case SupportedStores.AUDIBLE_IT:
    case SupportedStores.AUDIBLE_JP:
      if (CanonicalURL.indexOf(AUDIBLE_BOOK) > -1) {
        ASIN = $($(".bc-audio-trigger")[0]).data("asin");
        Author = retrieveAudibleAuthor();
        Title = $($("h1.bc-heading")[0]).text().trim();
      }
      break;

    case SupportedStores.AUDIBLE:
      if (CanonicalURL.indexOf(AUDIBLE_BOOK) > -1) {
        ASIN = $("meta[property='book:isbn']").attr("content").trim();
        Author = $(".adbl-author-row a span").text().trim();
        Title = $(".adbl-prod-h1-title").text().trim();
      }
      break;

		case SupportedStores.BOOK_DEPOSITORY:
			ASIN = $("li span[itemprop='isbn']").text().trim();
      Author = $(".item-info .author-info a").text().trim();
      Title = $(".item-info h1").text().trim();
			break;

    case SupportedStores.GOOGLE_PLAY:
      ASIN = $("div[itemprop='isbn']").text();
      Author = $(".document-subtitle[itemprop='author']").text().trim();
      Title = $(".document-title").text().trim();

      var series = $(".document-subtitle .series-order").text();
      if (series !== "" && series !== undefined) Title = Title + " " + series;

      break;

    case SupportedStores.STRAND:
      ASIN = retrieveStrandASIN();
      Author = retrieveStrandAuthor();
      Title = $("h1.product-detail__name").text().trim();
      break;
	}

  if (DEBUG) {
    console.log("ASIN: " + ASIN);
    console.log("Author: " + Author);
    console.log("Title: " + Title);
  }

	if (ASIN === "" || ASIN === undefined) {
    if (Title !== "" && Title !== undefined) requestGoodreadsDataByTitle();
	} else {
		requestGoodreadsDataByASIN();
	}
}


// Tries to find the book's ASIN in Amazon's website.
function retrieveAmazonASIN() {
  var ASIN = $("#averageCustomerReviews").data("asin");

  if (ASIN === "" || ASIN === undefined) {
    $("#detail_bullets_id li").each(function(index, value) {
      var attribute = $(this).find("b").text();

      if (attribute.indexOf("ISBN") !== -1) {
        var components = $(this).text().split(":");
        ASIN = components[1].trim();
        return false;
      }
    });
  }

  return ASIN;
}


// Tries to find the book's author in Audible's website.
function retrieveAudibleAuthor() {
  var author = "";

  $(".bc-heading").parent().find("li").each(function(index, value) {
    var attribute = $(this).find("span").text();

    if (attribute.indexOf("Autore") !== -1 || attribute.indexOf("著者") !== -1) {
      var components = $(this).text().split(":");
      author = components[1].trim();
      return false;
    }
  });

  return author;
}


// Tries to find the book's ASIN in The Strand's website.
// Different pages of the website might have slightly different HTML.
// First, looks for a <span> with itemprop="isbn".
// Then, looks for a <li> with "ISBN-10" text.
// Finally, looks for a <li> with "ISBN-13" text.
function retrieveStrandASIN() {
  var ASIN = $(".v-product-detailinfo span[itemprop='isbn']").text().trim();

  if (ASIN === "" || ASIN === undefined) {
    $(".v-product-detailinfo li").each(function(index, value) {
      var attribute = $(this).find("b").text();

      if (attribute === "ISBN-10") {
        var components = $(this).text().split(":");
        var ISBN10 = components[1].trim();
        if (ISBN10 !== "" && ISBN10 !== undefined) ASIN = ISBN10;
      } else if (attribute === "ISBN-13") {
        var ISBN13 = $(this).find("span").text().trim();
        if (ISBN13 !== "" && ISBN13 !== undefined) ASIN = ISBN13;
      }
    });
  }

  return ASIN;
}

function retrieveStrandAuthor() {
  var authors = $("h4.product-detail__author a");
  var author = "";

  if (authors.length < 2) {
    author = authors.text().trim();
  } else {
    authors.each(function(index, value) {
      author = author + " " + $(this).text().trim();
    });
  }

  return author;
}

// Sends an Ajax request to Goodreads, passing the book's ASIN.
function requestGoodreadsDataByASIN() {
  if (DEBUG) console.log("Querying Goodreads by ASIN");

	var URL = REQUEST_URL_ISBN + ASIN + "?key=" + API_KEY;

	$.ajax({
		url: URL,
		dataType: "xml",
    error: function() {
      if (DEBUG) console.log("Query by ASIN failed");
      if (Title !== "" && Title !== undefined) requestGoodreadsDataByTitle();
    },
		success: parseGoodreadsResponse
	});
}


// Sends an Ajax request to Goodreads, passing the book's author and title.
function requestGoodreadsDataByTitle() {
  if (DEBUG) console.log("Querying Goodreads by title");

  var authorQuery = "";
  if (Author !== "" && Author !== undefined) {
    authorQuery = "&author=" + encodeURIComponent(Author);
  }

  var titleQuery = "";
  if (Title !== "" && Title !== undefined) {
    titleQuery = "&title=" + encodeURIComponent(Title);
  }

	var URL = REQUEST_URL_TITLE + "?key=" + API_KEY + authorQuery + titleQuery;

	$.ajax({
		url: URL,
		dataType: "xml",
    error: function() {
      if (DEBUG) console.log("Query by title failed");
    },
		success: parseGoodreadsResponse
	});
}


// Parses the Goodreads response, extracting the book's rating, the rating count,
// and the book's Goodreads URL. Once done, initiates HTML injection into current page.
function parseGoodreadsResponse(response, status, jqXHR) {
	var XML = $(response);
	var book = XML.find("book");

  var averageRating = parseFloat(book.find("average_rating").text());
  averageRating = Math.round(averageRating * 100) / 100;
  if (averageRating > TOTAL_STARS) averageRating = TOTAL_STARS;

	var ratingCount = parseInt(book.find("work").find("ratings_count").text());
	var bookURL = book.find("url").text();

	if (DEBUG) {
    console.log("Rating: " + averageRating);
    console.log("Rating count: " + ratingCount);
    console.log("Goodreads URL: " + bookURL);
  }

	injectRating(averageRating, ratingCount, bookURL);
}


// Generates Goodreads rating HTML and appends it to the current page.
function injectRating(averageRating, ratingCount, bookURL) {
	var goodreadsRating = createRating(averageRating, ratingCount, bookURL);
  appendRatingToStore(goodreadsRating);
}


// Generates Goodreads rating HTML. HTML differs for each store.
function createRating(averageRating, ratingCount, bookURL) {
  // Creates rating container
  var goodreadsRating = $("<span>", {class: "gfc-goodreadsRating"});

  // Creates stars container, stars
  var goodreadsStars = createStars(averageRating);

  // Creates rating container, rating
  var goodreadsValue = $("<span>", {class: "gfc-rating", text: averageRating.toFixed(2)});

  // Creates rating count container, rating count
  var goodreadsCount = $("<span>", {class: "gfc-count"});

  var countText = ratingCount.toLocaleString();
  if (CurrentStore !== SupportedStores.GOOGLE_PLAY) countText = countText + " Goodreads ratings";

  var count = "<a target='_blank' href='" + bookURL + "'>" + countText + "</a>";
  if (CurrentStore === SupportedStores.AUDIBLE) count = " (" + count + ")";

  goodreadsCount.append(count);

  // Creates Goodreads icon
  var goodreadsIcon = $("<span>", {class: "gfc-icon"});

  // Appends everything to the rating container
  goodreadsRating.append(goodreadsStars);
  if (CurrentStore !== SupportedStores.GOOGLE_PLAY) goodreadsRating.append(goodreadsValue);
  goodreadsRating.append(goodreadsCount);
  if (CurrentStore === SupportedStores.GOOGLE_PLAY) goodreadsRating.append(goodreadsIcon);

  return goodreadsRating;
}


// Creates a star container and appends 5 Goodreads stars to it.
// The stars represent the Goodreads rating for the book.
function createStars(averageRating) {
  var goodreadsStars = $("<span>", {class: "gfc-stars"});
  if (CurrentStore === SupportedStores.GOOGLE_PLAY) goodreadsStars.attr("title", averageRating);

	var fullStarCount = Math.floor(averageRating);
	var partialStarValue = averageRating - fullStarCount;
	var emptyStarCount = TOTAL_STARS - fullStarCount - Math.ceil(partialStarValue);

	appendFullStars(goodreadsStars, fullStarCount, "gfc-p10");
	if (partialStarValue > 0) appendPartialStar(goodreadsStars, partialStarValue);
	appendFullStars(goodreadsStars, emptyStarCount, "gfc-p0");

  return goodreadsStars;
}


// Appends full Goodreads stars to the provided container.
function appendFullStars(container, count, type) {
	for (var i = 0; i < count; i++) {
		var goodreadsStar = $("<span>", {class: ["gfc-star", type].join(" ")});
		container.append(goodreadsStar);
	}
}


// Appends a partial star to the provided container using Goodreas rules:
// (0.00, p0), (1.00, p10), (0.01 - 0.49, p3), (0.50 - 0.99, p6)
function appendPartialStar(container, value) {
	var goodreadsStar = $("<span>", {class: "gfc-star"});
  if (value < 0.5) goodreadsStar.addClass("gfc-p3");
	else goodreadsStar.addClass("gfc-p6");

  container.append(goodreadsStar);
}


// Appends Goodreads rating HTML to the current page.
// Exact rating location differs for each store.
function appendRatingToStore(goodreadsRating) {
  switch (CurrentStore) {
		case SupportedStores.AMAZON:
      goodreadsRating.addClass("gfc-amazon");
			goodreadsRating.insertAfter($("#byline"));
			break;

    case SupportedStores.AUDIBLE:
      var audibleRating = $("#center_2 .adbl-ratings-row");
      goodreadsRating.addClass("gfc-audible");
      if (audibleRating.children().length === 0) goodreadsRating.css("margin-top", "0");
      audibleRating.append(goodreadsRating);
      break;

    case SupportedStores.AUDIBLE_IT:
    case SupportedStores.AUDIBLE_JP:
      goodreadsRating.addClass("gfc-audible-it");
      $($(".bc-heading")[0]).parent().append(goodreadsRating);
      break;

		case SupportedStores.BOOK_DEPOSITORY:
			goodreadsRating.addClass("gfc-bookdepository")
			goodreadsRating.insertAfter(".item-block .item-info h1");
			break;

    case SupportedStores.GOOGLE_PLAY:
      goodreadsRating.addClass("gfc-google-play");
      $(".right-info").append(goodreadsRating);
      break;

    case SupportedStores.STRAND:
      goodreadsRating.addClass("gfc-strand")
      $(".product-detail__header-group").append(goodreadsRating);
	}
}

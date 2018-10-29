const express = require('express');
const cors = require('cors');
const URL = require('url');
const Xray = require('x-ray');
const x = Xray({
	filters: {
		trim: (value) => {
			return typeof value === 'string' ? value.trim() : value;
		}
	}
});

const app = express();
const categories = ['news', 'business', 'entertainment', 'life', 'sports', 'overseas', 'trending', 'focus'];
const dbURI = 'https://imquiz-001.firebaseio.com/';
const appDomain = 'https://imquiz-001.firebaseio.com/';

const newsNode = dbURI + '/10292018.json'

app.use(cors());

/**
 * Scrape promise that will get all articles
 *
 * @param {String} url
 */
function getArticles (url) {
	return new Promise((resolve, reject) => {
		const scrape = x(url, 'div.articles article', [{
			title: '.title',
			author: '.author',
			datetime: '.datetime',
			text: x('.content', ['p']),
			thumbnail: 'a img@src',
			url: 'a @href'
		}]);

		scrape((err, result) => {

			if (err) {
				reject(err);
			}

			result = result.map((r) => {
				r.text = r.text[2].replace('\r\n Read more »', '');
				return r;
			});

			resolve(result);
		});

	})
}

/**
 * Returns all available categories
 */
app.get('/api/categories', (req, res) => {
	res.json({
		success: true,
		data: categories
  });
});

/**
 * Scrapes an article
 *
 * @query {String} url = URL of article to be scraped
 */
app.get('/api/article', (req, res) => {

	const url = req.query.url;

	if (!url) {
		return res.status(404).json({
			success: false,
			message: 'Article url not found.'
		});
	}

	const scrape = x(url, {
		title: x('.news-title'),
		author: x('.author-details'),
		datetime: x('.date-posted'),
		content: x('div.article-content', ['p']),
		media: x('div.article-content', ['img @src'])
	});

	scrape((err, result) => {

		if (err) {
			console.log(err);
			res.status(500).json({
				success: false,
				message: 'An error occurred.'
			});
		}

		res.json({
			sucess: true,
			data: result
    });


	});
});

/**
 * Scrapes all article by category
 *
 * @query {String} category = Category of articles to be scraped
 */
app.get('/api/articles', (req, res) => {

	if (!req.query.category) {
		req.query.category = 'news';
	}

	if (!categories.includes(req.query.category)) {
		return res.status(404).json({
			success: false,
			message: 'Category not found.'
		});
	}

	const url = 'http://news.abs-cbn.com/' + req.query.category;
	const scrapeNumberOfPages = x(url, {lastPageUrl: '.last @href'});

	scrapeNumberOfPages((err, result) => {

		if (err) {
			console.log(err);
			res.status(500).json({
				success: false,
				message: 'An error occurred.'
			});
		}

		const parts = URL.parse(result.lastPageUrl, true);
		const pages = +parts.query.page;

		const promises = [];

		for (let y = 1; y <= pages; y++) {
			promises.push(getArticles(`http://news.abs-cbn.com/${req.query.category}?page=${y}`));
		}

		Promise.all(promises)
		.then(data => {
			const merged = [].concat.apply([], data);
			res.json({
				success: true,
				totalArticles: merged.length,
				category: req.query.category,
				data: merged
      });
		})
		.catch(error => {
			console.log(error);
			res.status(500).json({
				success: false,
				message: 'An error occurred.'
			});
		});

	});
});

app.listen(5005, () => {
	console.log('Listening on port ' + 5005);
});

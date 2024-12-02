SYSTEM_PROMPT = "You are a helpful assistant. Your task is to analyze given screenshots of websites, reason whether they might phishing and return a well-formed output according to the user prompt."

USER_PROMPT = """I need you to analyze this website screenshot, content language, domain name and protocol, and tell me if it's a phishing website or not.
The screenshot is attached in the prompt. The protocol and the domain of the website depicted in the screenshot is {site_url}.
The website content is most likely written in these languages: {languages}.
Note that the website might be in a language different than English or it might look ugly or broken. It may or may not be a scam website.
Provide a detailed and careful analysis of the given URL (protocol, domain, spelling, etc) as well as the screenshot provided to determine if it's a phishing website or not. 
Be cautious and attentive to details. Take logos found on the website into account. They can usually give you the website identity with pretty good accuracy. 
I would also be interested in knowing whether the screenshot depicts a login page or not.
I expect the answer to be in JSON format with the following schema:

* `isPhishing`: float, between 0 and 1: confidence score of whether the website is a phishing website.
* `isLoginPage`: float, between 0 and 1: confidence score of whether the website is a login page (a page cannot be phishing if it is not a login page).
* `websiteDomain`: str: make a guess about the expected domain of the real website depicted in the screenshot (without taking into account the URL provided, it's very important to look inside the image for clues on the website identity, it might not be a famous website, if you don't know the website leave it empty).
* `reasoning`: str: a detailed reasoning of why the website is a phishing website or not.
* `error`: bool: default value is false, only set to to true if there is an issue with the image e.g. it is completely black or empty or you can't analyze it

If there is an issue with the image, if it is black or the page is not fully loaded use the error property in the response.
I will give you a tip for the good answer!
"""

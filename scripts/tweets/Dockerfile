FROM python:3.7

WORKDIR /tweets_scrapper

COPY . /tweets_scrapper

RUN pip install --trusted-host pypi.python.org -r requirements.txt

CMD [ "python", "./listener.py" ]
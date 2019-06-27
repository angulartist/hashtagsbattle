FROM python:3.7

RUN pip install virtualenv

ENV VIRTUAL_ENV=/opt/venv

RUN python3 -m virtualenv --python=/usr/bin/python3 $VIRTUAL_ENV

ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY . .

RUN pip install --trusted-host pypi.python.org -r requirements.txt

CMD [ "python", "./main.py" ]
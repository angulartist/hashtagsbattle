# Dataflow does not supported Python 3 yet.
FROM python:2.7

RUN pip install virtualenv

ENV VIRTUAL_ENV=/opt/venv

RUN virtualenv $VIRTUAL_ENV

ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY . .

RUN pip install --trusted-host pypi.python.org -r requirements.txt

CMD [ "python", "./main.py", "--setup_file", "./setup.py" ]
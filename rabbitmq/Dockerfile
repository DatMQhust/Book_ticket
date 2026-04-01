FROM rabbitmq:3.13-management

RUN apt-get update -y && \
    apt-get install -y --no-install-recommends wget && \
    wget -q https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v3.13.0/rabbitmq_delayed_message_exchange-3.13.0.ez \
        -O /opt/rabbitmq/plugins/rabbitmq_delayed_message_exchange-3.13.0.ez && \
    chmod 644 /opt/rabbitmq/plugins/rabbitmq_delayed_message_exchange-3.13.0.ez && \
    apt-get remove -y wget && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY enabled_plugins /etc/rabbitmq/enabled_plugins

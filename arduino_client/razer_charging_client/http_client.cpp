#include "http_client.h"
#include "mouse.h"
#include <Arduino.h>
#include "config.h"

Http_client::Http_client(Mouse *mouse){
  this->http_client->onConnect(my_onConnect, this);
  this->http_client->onData(my_onData, this);
  this->http_client->onDisconnect(my_onDisconnect, mouse);
  this->http_client->onError(my_onError, this);
  this->payloadBuffer.reserve(1024);
}

void Http_client::connect() {
    this->http_client->connect(HOST, PORT);
    this->lastRequest = millis();
}

void Http_client::my_onData(void* arg, AsyncClient* c, void* data, size_t len) {
  Http_client* instance = (Http_client*)arg;
  instance->payloadBuffer.concat((char*)data, len);
}

void Http_client::my_onDisconnect(void* arg, AsyncClient* c) {
  Mouse* instance = (Mouse*)arg;
  instance->parse_data();
}

void Http_client::my_onConnect(void* arg, AsyncClient* c) {
  Http_client* instance = (Http_client*)arg;
  instance->payloadBuffer = ""; // Clear buffer before starting
  char request[128];
  snprintf(request, sizeof(request), 
           "GET / HTTP/1.1\r\nHost: %s\r\nConnection: close\r\n\r\n", 
           HOST);

  c->write(request);
}

void Http_client::my_onError(void* arg, AsyncClient* c, int8_t error) {
  Http_client* instance = (Http_client*)arg;
  instance->retry_counter += 1;
  //Serial.println("Failed to connect...");
}

void Http_client::reset_retry_counter(){
  this->retry_counter = 0;
}

int Http_client::getRetry_counter(){
  return this->retry_counter;
}

unsigned long Http_client::getLastRequest(){
  return this->lastRequest;
}
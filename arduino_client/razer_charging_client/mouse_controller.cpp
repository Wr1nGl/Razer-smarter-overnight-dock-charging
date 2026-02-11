#include "mouse_controller.h"
#include "config.h"
#include <Arduino.h>

Mouse_controller::Mouse_controller(){
  this->mouse = new Mouse();
}

void Mouse_controller::setMux(int state) {
  digitalWrite(MUX_SELECT_PIN, state);
}

void Mouse_controller::calculate_cycles_needed() {
  int charge_needed = this->mouse->getBattery_max_charge_level() - this->mouse->getBattery_level();

  //above the limit
  if (charge_needed < 0){
    this->cycles_needed = 0;
    return;
  }

  this->cycles_needed = (int)(charge_needed / this->mouse->getCharge_gain());
}

void Mouse_controller::loop(){
  //if the computer is on
  if (this->computer_state){
    //check if the pc has been turned off
    if (this->mouse->getHttp_client()->getRetry_counter() >= MAX_RETRIES){
      this->calculate_cycles_needed();
      this->computer_state = 0;
      this->setMux(0);
      this->charger_state = 1;
      this->last_change_time = millis();
      Serial.println("Computer has been turned OFF, starting charging...");
    }
    else{
      //use default timeout
      this->mouse->loop(TIMEOUT);
    }
  }
  //start charging routine
  else{
    //use detection timeout to minimize delay
    this->mouse->loop(DELAY_TIMEOUT);
    //should be true if PC is on; cancel charging routine and connect to PC
    if (this->mouse->getHttp_client()->getRetry_counter() < MAX_RETRIES){
      this->computer_state = 1;
      this->charger_state = 1;
      this->setMux(0);
      Serial.println("Computer has been turned ON, switching source to PC...");
    }
    //charging routine
    if (this->current_cycle < this->cycles_needed){
      int timer_goal = this->charger_state ? this->mouse->getCharge_time()* 1000 * 60 : this->mouse->getCooldown_time()* 1000 * 60;
      if (millis() - this->last_change_time > timer_goal) {
        //*
        Serial.println("Charging routine: ");
        Serial.print("Charging: ");
        Serial.println(this->charger_state);

        Serial.print("Current cycle: ");
        Serial.println(this->current_cycle + 1);

        Serial.print("Total cycles: ");
        Serial.println(this->cycles_needed);
        //*/
        this->last_change_time = millis();
        this->charger_state = !this->charger_state;
        this->setMux(!this->charger_state);
        //i have made a full cycle
        if (this->charger_state){
          this->current_cycle += 1;
        }
      }
    }
    else{
      if (!this->computer_wait_lock){
        this->computer_wait_lock = 1;
        Serial.println("Charging done, waiting for computer to boot...");
        this->charger_state = 0;
        this->setMux(1);
      }
    }
  }
    
}

